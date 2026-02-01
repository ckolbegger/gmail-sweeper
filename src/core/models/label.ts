/**
 * Label Model Types and Validation
 *
 * Defines the Label entity with Zod runtime validation.
 */

import { z } from 'zod';
import type { Label } from '../contracts/types.js';

// ============================================================================
// Schemas
// ============================================================================

export const LabelColorSchema = z.object({
  backgroundColor: z.string(),
  textColor: z.string(),
});

export const LabelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['system', 'user']),
  color: LabelColorSchema.optional(),
  updatedAt: z.date(),
});

// ============================================================================
// Types
// ============================================================================

// Types are exported from contracts/types.ts to avoid duplication
// Use: import type { Label, LabelColor } from '@core/contracts/types.js'

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a label object
 */
export function validateLabel(data: unknown): Label {
  return LabelSchema.parse(data);
}

/**
 * Safely validate a label object
 */
export function safeValidateLabel(data: unknown): {
  success: boolean;
  data?: Label;
  error?: z.ZodError;
} {
  const result = LabelSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// System Labels
// ============================================================================

export const SYSTEM_LABELS = [
  'INBOX',
  'SENT',
  'DRAFT',
  'TRASH',
  'SPAM',
  'STARRED',
  'UNREAD',
  'IMPORTANT',
  'CATEGORY_PERSONAL',
  'CATEGORY_SOCIAL',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_UPDATES',
  'CATEGORY_FORUMS',
] as const;

/**
 * Check if a label ID is a system label
 */
export function isSystemLabel(labelId: string): boolean {
  return SYSTEM_LABELS.includes(labelId as typeof SYSTEM_LABELS[number]);
}
