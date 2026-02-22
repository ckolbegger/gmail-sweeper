/**
 * T027: Smart filter runner - orchestrates AI classification in batches
 */

import type { Email } from '../models/index.js';
import type { AiProvider, EmailMetadata, EmailClassification } from '../ai/provider.js';
import { calculateEmailBatchSize } from './batch-sizing.js';

export interface SmartFilterOptions {
  provider: AiProvider;
  description: string;
  emails: Email[];
  signal?: AbortSignal;
  maxContextTokens?: number;
  onProgress?: (progress: {
    matchingResults: EmailClassification[];
    evaluatedCount: number;
    totalCount: number;
    currentBatch: number;
    totalBatches: number;
  }) => void;
}

export interface SmartFilterResult {
  allResults: EmailClassification[];
  matchingResults: EmailClassification[];
  totalEvaluated: number;
}

/**
 * Convert Email to EmailMetadata for classification
 */
function toEmailMetadata(email: Email): EmailMetadata {
  return {
    id: email.id,
    subject: email.subject,
    sender: typeof email.sender === 'string' ? email.sender : email.sender.email,
    snippet: email.snippet,
  };
}

/**
 * Run smart filter - classify emails in batches using AI
 * @param options - Filter options including provider, description, and emails
 * @returns Filter results with matching emails sorted by confidence
 */
export async function runSmartFilter(options: SmartFilterOptions): Promise<SmartFilterResult> {
  const { provider, description, emails, signal, maxContextTokens = 32000, onProgress } = options;

  if (!description || description.trim().length === 0) {
    throw new Error('Filter description cannot be empty (FR-013)');
  }

  if (emails.length === 0) {
    return { allResults: [], matchingResults: [], totalEvaluated: 0 };
  }

  const batchSize = calculateEmailBatchSize(emails.map(toEmailMetadata), maxContextTokens);

  const batches: Email[][] = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    batches.push(emails.slice(i, i + batchSize));
  }

  const allResults: EmailClassification[] = [];
  const totalBatches = batches.length;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    if (signal?.aborted) {
      throw new Error('Aborted');
    }

    const batch = batches[batchIndex];
    if (!batch) {
      continue;
    }
    const metadata = batch.map(toEmailMetadata);

    const batchResults = await provider.classifyEmails(description, metadata, signal);

    allResults.push(...batchResults);

    if (onProgress) {
      onProgress({
        matchingResults: allResults
          .filter((r) => r.matches)
          .sort((a, b) => b.confidence - a.confidence),
        evaluatedCount: allResults.length,
        totalCount: emails.length,
        currentBatch: batchIndex + 1,
        totalBatches,
      });
    }
  }

  const matchingResults = allResults
    .filter((r) => r.matches)
    .sort((a, b) => b.confidence - a.confidence);

  return {
    allResults,
    matchingResults,
    totalEvaluated: emails.length,
  };
}
