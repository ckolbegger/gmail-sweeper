import { Email } from '../../types';
import { AiProvider, EmailMetadata, EmailClassification } from '../ai/provider';
import { calculateBatchSize } from './batchSizing';

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

/**
 * Run smart filter evaluation.
 *
 * Evaluates emails in batches, calling onProgress after each batch.
 * Returns final results when all batches complete.
 */
export async function runSmartFilter(options: SmartFilterOptions): Promise<FilterResult> {
  const { description, emails, provider, maxContextTokens = 32000, onProgress, signal } = options;

  if (emails.length === 0) {
    return { allResults: [], matchingResults: [], totalEvaluated: 0 };
  }

  const metadata: EmailMetadata[] = emails.map(e => ({
    id: e.id,
    subject: e.subject,
    senderName: e.from.split('<')[0].trim() || e.from,
    senderEmail: e.from.match(/<(.+)>/)?.[1] || e.from,
    snippet: e.snippet
  }));

  const allResults: EmailClassification[] = [];
  const totalCount = emails.length;
  
  let processedCount = 0;
  let batchIndex = 0;

  // Initial estimate of total batches
  const initialBatchSize = calculateBatchSize(metadata, maxContextTokens);
  let totalBatches = Math.ceil(totalCount / initialBatchSize);

  while (processedCount < totalCount) {
    if (signal?.aborted) {
      throw new Error('Filter cancelled');
    }

    const remainingMetadata = metadata.slice(processedCount);
    const currentBatchSize = calculateBatchSize(remainingMetadata, maxContextTokens);
    const batchEmails = remainingMetadata.slice(0, currentBatchSize);
    
    batchIndex++;
    
    const response = await provider.classifyEmails({
      filterDescription: description,
      emails: batchEmails
    });

    if (signal?.aborted) {
      throw new Error('Filter cancelled');
    }

    allResults.push(...response.results);
    processedCount += batchEmails.length;

    // Refine totalBatches estimate
    if (processedCount < totalCount) {
        totalBatches = batchIndex + Math.ceil((totalCount - processedCount) / currentBatchSize);
    } else {
        totalBatches = batchIndex;
    }

    if (onProgress) {
      const matchingResults = allResults
        .filter(r => r.matches)
        .sort((a, b) => b.confidence - a.confidence);

      onProgress({
        matchingResults,
        evaluatedCount: processedCount,
        totalCount,
        currentBatch: batchIndex,
        totalBatches
      });
    }
  }

  const matchingResults = allResults
    .filter(r => r.matches)
    .sort((a, b) => b.confidence - a.confidence);

  return {
    allResults,
    matchingResults,
    totalEvaluated: processedCount
  };
}
