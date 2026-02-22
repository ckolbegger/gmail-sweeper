import type { Email } from '../contracts/types.js';
import type { AiProvider, EmailClassification } from '../ai/provider.js';
import { calculateBatchSize } from './batch-sizing.js';

export interface FilterProgress {
  matchingResults: EmailClassification[];
  evaluatedCount: number;
  totalCount: number;
  currentBatch: number;
  totalBatches: number;
}

export interface FilterResult {
  allResults: EmailClassification[];
  matchingResults: EmailClassification[];
  totalEvaluated: number;
}

export interface SmartFilterOptions {
  description: string;
  emails: Email[];
  provider: AiProvider;
  maxContextTokens?: number;
  onProgress?: (progress: FilterProgress) => void;
  signal?: AbortSignal;
}

export async function runSmartFilter(options: SmartFilterOptions): Promise<FilterResult> {
  const { description, emails, provider, maxContextTokens = 32000, onProgress, signal } = options;

  if (!description || !description.trim()) {
    throw new Error('Filter description cannot be empty');
  }

  if (emails.length === 0) {
    return {
      allResults: [],
      matchingResults: [],
      totalEvaluated: 0,
    };
  }

  const allResults: EmailClassification[] = [];
  const emailsWithText = emails.map((email) => ({
    ...email,
    text: `${email.subject}\n${email.body.text}`,
  }));

  const batchSize = calculateBatchSize(emailsWithText, maxContextTokens);
  const totalBatches = Math.ceil(emails.length / batchSize);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    if (signal?.aborted) {
      throw new Error('Filter evaluation cancelled');
    }

    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, emails.length);
    const batchEmails = emails.slice(start, end);

    const classifications = await provider.classifyEmails({
      filterDescription: description,
      emails: batchEmails.map((email) => ({
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        snippet: email.snippet,
      })),
    });

    allResults.push(...classifications);

    const matchingResults = allResults
      .filter((r) => r.matches)
      .sort((a, b) => b.confidence - a.confidence);

    if (onProgress) {
      onProgress({
        matchingResults,
        evaluatedCount: end,
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
