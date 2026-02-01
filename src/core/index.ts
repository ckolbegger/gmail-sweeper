// Re-export core public API

// Models (domain entities with parsing/validation)
export {
  EmailSchema,
  EmailAddressSchema,
  EmailBodySchema,
  parseGmailMessage,
  type Email as ModelEmail,
  type EmailAddress,
  type EmailBody,
} from './models/email.js';

export {
  LabelSchema,
  LabelColorSchema,
  parseGmailLabel,
  isSystemLabel,
  getLabelDisplayName,
  type Label as ModelLabel,
  type LabelColor,
} from './models/label.js';

// Contracts (shared interfaces and types)
export type * from './contracts/types.js';

export type {
  AuthManager,
  GmailClient,
  LabelManager,
  SyncProgress,
  SyncResult,
  BatchActionResult,
} from './contracts/gmail-api.js';

export type {
  NLQueryEngine,
  QueryRepository,
  QueryEngineStatus,
  QueryExecutionResult,
  ScoredEmail,
} from './contracts/nl-query.js';

export type {
  WorkflowEngine,
  WorkflowRepository,
  ExecutionRepository,
  ConflictResolutionStrategy,
} from './contracts/workflow.js';

export {
  GmailError,
  type GmailErrorCode,
  DEFAULT_SCOPES,
} from './contracts/gmail-api.js';

export {
  NLQueryError,
  DEFAULT_NL_CONFIG,
  DEFAULT_SYSTEM_PROMPT,
} from './contracts/nl-query.js';

export {
  WorkflowError,
  DEFAULT_WORKFLOW_CONFIG,
} from './contracts/workflow.js';

// Persistence
export { database, getDatabase, closeDatabase } from './persistence/database.js';

// Errors
export {
  GmailSweepError,
  GmailError as CoreGmailError,
  DatabaseError,
  ValidationError,
  ConfigurationError,
  type GmailErrorCode as CoreGmailErrorCode,
} from './errors/index.js';

// Logging
export { logger, LogLevel } from './logging/index.js';
