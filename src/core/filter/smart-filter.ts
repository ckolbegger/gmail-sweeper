/**
 * T020: Smart filter orchestrator.
 *
 * Evaluates emails in token-aware batches against a natural language
 * description, providing progressive results via callbacks.
 */

import type { Email } from '../models/index.js';
import type {
  AiProvider,
  EmailClassification,
  EmailMetadata,
} from '../ai/provider.js';
import { calculateBatchSize } from './batch-sizing.js';

// --- Types ---

export type FilterStatus = 'idle' | 'loading' | 'complete' | 'error';

/** Progress update emitted after each batch completes */
export interface FilterProgress {
  matchingResults: EmailClassification[];
  evaluatedCount: number;
  totalCount: number;
  currentBatch: number;
  totalBatches: number;
}

/** Final filter result */
export interface FilterResult {
  allResults: EmailClassification[];
  matchingResults: EmailClassification[];
  totalEvaluated: number;
}

/** Options for running the smart filter */
export interface SmartFilterOptions {
  description: string;
  emails: Email[];
  provider: AiProvider;
  maxContextTokens?: number;
  onProgress?: (progress: FilterProgress) => void;
  signal?: AbortSignal;
}

// --- Helpers ---

function toEmailMetadata(email: Email): EmailMetadata {
  return {
    id: email.id,
    subject: email.subject,
    senderName: email.sender.name ?? '',
    senderEmail: email.sender.email,
    snippet: email.snippet,
  };
}

// --- Main ---

export async function runSmartFilter(
  options: SmartFilterOptions,
): Promise<FilterResult> {
  const {
    description,
    emails,
    provider,
    maxContextTokens,
    onProgress,
    signal,
  } = options;

  if (!description.trim()) {
    throw new Error('Filter description must not be empty');
  }

  if (emails.length === 0) {
    return { allResults: [], matchingResults: [], totalEvaluated: 0 };
  }

  const metadata = emails.map(toEmailMetadata);
  const batchSize = calculateBatchSize(metadata, maxContextTokens);

  // Split into batches
  const batches: EmailMetadata[][] = [];
  for (let i = 0; i < metadata.length; i += batchSize) {
    batches.push(metadata.slice(i, i + batchSize));
  }

  const allResults: EmailClassification[] = [];
  const matchingResults: EmailClassification[] = [];

  for (let i = 0; i < batches.length; i++) {
    if (signal?.aborted) {
      throw new Error('Smart filter aborted');
    }

    const batch = batches[i]!;
    const response = await provider.classifyEmails({
      filterDescription: description,
      emails: batch,
    });

    allResults.push(...response.results);
    for (const r of response.results) {
      if (r.matches) {
        matchingResults.push(r);
      }
    }

    // Sort matching results by confidence desc for progressive updates
    matchingResults.sort((a, b) => b.confidence - a.confidence);

    if (signal?.aborted) {
      throw new Error('Smart filter aborted');
    }

    onProgress?.({
      matchingResults: [...matchingResults],
      evaluatedCount: allResults.length,
      totalCount: emails.length,
      currentBatch: i + 1,
      totalBatches: batches.length,
    });
  }

  matchingResults.sort((a, b) => b.confidence - a.confidence);

  return {
    allResults,
    matchingResults,
    totalEvaluated: allResults.length,
  };
}
