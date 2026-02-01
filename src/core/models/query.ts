/**
 * Query Model Types and Validation
 *
 * Defines the Query entity for saved natural language queries.
 */

import { z } from 'zod';
import type { Query } from '../contracts/types.js';

// ============================================================================
// Schemas
// ============================================================================

export const QuerySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  naturalLanguageText: z.string().min(1).max(1000),
  description: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastRunAt: z.date().optional(),
  runCount: z.number().int().min(0).default(0),
});

// ============================================================================
// Types
// ============================================================================

// Types are exported from contracts/types.ts to avoid duplication
// Use: import type { Query } from '@core/contracts/types.js'

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a query object
 */
export function validateQuery(data: unknown): Query {
  return QuerySchema.parse(data);
}

/**
 * Safely validate a query object
 */
export function safeValidateQuery(data: unknown): {
  success: boolean;
  data?: Query;
  error?: z.ZodError;
} {
  const result = QuerySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate query creation input (without auto-generated fields)
 */
export function validateQueryInput(data: unknown): Omit<Query, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> {
  return QuerySchema.omit({ id: true, createdAt: true, updatedAt: true, runCount: true }).parse(data);
}
