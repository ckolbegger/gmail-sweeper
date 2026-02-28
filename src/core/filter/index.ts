/**
 * Filter Module Barrel Export
 *
 * T045: Public exports for the filter module
 */

// Smart filter
export { runSmartFilter } from './smart-filter.js';
export type { SmartFilterOptions, SmartFilterResult } from './smart-filter.js';

// Batch sizing
export { calculateBatchSize, estimateTokens } from './batch-sizing.js';
