/**
 * Core Models Barrel Export
 *
 * Re-exports Zod schemas and validation functions.
 * Types are exported from contracts/index.ts to avoid duplication.
 */

// Export schemas and validation functions (but not types - those come from contracts)
export {
  EmailSchema,
  EmailAddressSchema,
  EmailBodySchema,
  GmailCategorySchema,
  validateEmail,
  validateEmailAddress,
  validateEmailPartial,
  safeValidateEmail,
  parseGmailMessage,
} from './email.js';

export {
  LabelSchema,
  LabelColorSchema,
  validateLabel,
  safeValidateLabel,
  isSystemLabel,
  SYSTEM_LABELS,
} from './label.js';

export {
  QuerySchema,
  validateQuery,
  safeValidateQuery,
  validateQueryInput,
} from './query.js';

export {
  WorkflowSchema,
  WorkflowActionSchema,
  WorkflowExecutionSchema,
  validateWorkflow,
  safeValidateWorkflow,
  validateWorkflowInput,
  validateWorkflowExecution,
  isLabelAction,
  isArchiveAction,
  isDeleteAction,
} from './workflow.js';

export {
  SessionSchema,
  validateSession,
  safeValidateSession,
  validateSessionInput,
  getSessionState,
  isSessionActive,
  getSessionDuration,
} from './session.js';
