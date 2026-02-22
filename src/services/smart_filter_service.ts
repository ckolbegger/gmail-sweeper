import type {
  AiProvider,
  EmailClassification,
  EmailMetadata
} from '@/adapters/ai/provider.js';
import type { Email } from '@/core/entities.js';
import { AiProviderError, ValidationError } from '@/core/errors.js';
import { calculateBatchSize, estimateTokens } from '@/services/batch_sizing.js';

const DEFAULT_MAX_CONTEXT_TOKENS = 32000;

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

interface SmartFilterDeps {
  estimateTokens?: (content: string) => number;
  calculateBatchSize?: (tokenEstimates: number[], maxContextTokens: number) => number;
}

function toEmailMetadata(email: Email): EmailMetadata {
  return {
    messageId: email.message_id,
    subject: email.subject ?? '',
    sender: email.sender ?? '',
    snippet: ''
  };
}

function ensureActive(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AiProviderError('Smart filter request was cancelled');
  }
}

function sortMatching(results: EmailClassification[]): EmailClassification[] {
  return [...results]
    .filter((entry) => entry.matches)
    .sort((left, right) => right.confidence - left.confidence);
}

export async function runSmartFilter(
  options: SmartFilterOptions,
  deps: SmartFilterDeps = {}
): Promise<FilterResult> {
  const description = options.description.trim();
  if (description.length === 0) {
    throw new ValidationError('Filter description cannot be empty', { field: 'description' });
  }

  if (options.emails.length === 0) {
    return {
      allResults: [],
      matchingResults: [],
      totalEvaluated: 0
    };
  }

  const estimate = deps.estimateTokens ?? estimateTokens;
  const batchSizer = deps.calculateBatchSize ?? calculateBatchSize;
  const maxContextTokens = options.maxContextTokens ?? DEFAULT_MAX_CONTEXT_TOKENS;
  const metadata = options.emails.map(toEmailMetadata);
  const tokenEstimates = metadata.map((entry) =>
    estimate(`${entry.subject} ${entry.sender} ${entry.snippet}`)
  );
  const batchSize = Math.max(1, batchSizer(tokenEstimates, maxContextTokens));
  const totalBatches = Math.ceil(metadata.length / batchSize);
  const allResults: EmailClassification[] = [];

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
    ensureActive(options.signal);
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, metadata.length);
    const batchEmails = metadata.slice(start, end);

    try {
      const response = await options.provider.classifyEmails({
        filterDescription: description,
        emails: batchEmails
      });
      allResults.push(...response.results);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AiProviderError) {
        throw error;
      }

      throw new AiProviderError('Failed to classify emails during smart filter run', {
        cause: error instanceof Error ? error.message : String(error),
        batch: batchIndex + 1
      });
    }

    options.onProgress?.({
      matchingResults: sortMatching(allResults),
      evaluatedCount: end,
      totalCount: metadata.length,
      currentBatch: batchIndex + 1,
      totalBatches
    });
  }

  return {
    allResults,
    matchingResults: sortMatching(allResults),
    totalEvaluated: allResults.length
  };
}
