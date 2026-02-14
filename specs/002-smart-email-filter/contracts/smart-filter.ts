/**
 * Contract: Smart Filter Service
 *
 * Orchestrates batch evaluation of emails against a filter description.
 * Provides progressive results via callbacks.
 */

import type { EmailClassification, AiProvider } from './ai-provider.js';
import type { Email } from '../../src/core/models/index.js';

// --- Types ---

export type FilterStatus = 'idle' | 'loading' | 'complete' | 'error';

/** Progress update emitted after each batch completes */
export interface FilterProgress {
  /** Emails matching so far (sorted by confidence desc) */
  matchingResults: EmailClassification[];
  /** Total emails evaluated so far */
  evaluatedCount: number;
  /** Total emails to evaluate */
  totalCount: number;
  /** Current batch number (1-indexed) */
  currentBatch: number;
  /** Total expected batches */
  totalBatches: number;
}

/** Final filter result */
export interface FilterResult {
  /** All classification results */
  allResults: EmailClassification[];
  /** Only matching results, sorted by confidence desc */
  matchingResults: EmailClassification[];
  /** Total emails evaluated */
  totalEvaluated: number;
}

/** Options for running the smart filter */
export interface SmartFilterOptions {
  /** Natural language filter description */
  description: string;
  /** Emails to evaluate */
  emails: Email[];
  /** AI provider to use */
  provider: AiProvider;
  /** Max context window tokens for dynamic batch sizing (default: 32000) */
  maxContextTokens?: number;
  /** Called after each batch completes with progressive results */
  onProgress?: (progress: FilterProgress) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

// --- Interface ---

/**
 * Run smart filter evaluation.
 *
 * Evaluates emails in batches, calling onProgress after each batch.
 * Returns final results when all batches complete.
 * Throws on AI error. Can be cancelled via AbortSignal.
 */
export type RunSmartFilter = (options: SmartFilterOptions) => Promise<FilterResult>;
