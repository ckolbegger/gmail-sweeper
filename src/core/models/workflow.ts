/**
 * Workflow Model Types and Validation
 *
 * Defines the Workflow entity for saved query-action pairs.
 */

import { z } from 'zod';
import type { Workflow, WorkflowAction, WorkflowExecution } from '../contracts/types.js';

// ============================================================================
// Schemas
// ============================================================================

export const WorkflowActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('LABEL'),
    params: z.object({
      labelId: z.string(),
      labelName: z.string(),
    }),
  }),
  z.object({
    type: z.literal('ARCHIVE'),
    params: z.object({}),
  }),
  z.object({
    type: z.literal('DELETE'),
    params: z.object({}),
  }),
]);

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  queryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  action: WorkflowActionSchema,
  executionOrder: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  sessionId: z.string().uuid(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  emailsMatched: z.number().int().min(0).default(0),
  emailsProcessed: z.number().int().min(0).default(0),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  error: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

// Types are exported from contracts/types.ts to avoid duplication
// Use: import type { Workflow, WorkflowAction, WorkflowExecution } from '@core/contracts/types.js'

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a workflow object
 */
export function validateWorkflow(data: unknown): Workflow {
  return WorkflowSchema.parse(data);
}

/**
 * Safely validate a workflow object
 */
export function safeValidateWorkflow(data: unknown): {
  success: boolean;
  data?: Workflow;
  error?: z.ZodError;
} {
  const result = WorkflowSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate workflow creation input
 */
export function validateWorkflowInput(
  data: unknown
): Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> {
  return WorkflowSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(data);
}

/**
 * Validate a workflow execution object
 */
export function validateWorkflowExecution(data: unknown): WorkflowExecution {
  return WorkflowExecutionSchema.parse(data);
}

// ============================================================================
// Type Guards
// ============================================================================

export function isLabelAction(action: WorkflowAction): action is { type: 'LABEL'; params: { labelId: string; labelName: string } } {
  return action.type === 'LABEL';
}

export function isArchiveAction(action: WorkflowAction): action is { type: 'ARCHIVE'; params: Record<string, never> } {
  return action.type === 'ARCHIVE';
}

export function isDeleteAction(action: WorkflowAction): action is { type: 'DELETE'; params: Record<string, never> } {
  return action.type === 'DELETE';
}
