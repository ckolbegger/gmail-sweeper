/**
 * Contract: Smart Filter Service
 *
 * Orchestrates batch evaluation of emails against a filter description.
 */

import type { AiProvider, EmailClassification } from './ai-provider.js';
import type { Email } from '../../src/core/entities.js';

export type FilterStatus = 'idle' | 'loading' | 'filtered' | 'error';

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

export type RunSmartFilter = (options: SmartFilterOptions) => Promise<FilterResult>;
