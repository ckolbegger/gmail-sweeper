/**
 * Shared Type Definitions
 *
 * Core types used across all contracts. These represent the domain model
 * and are implemented by the core library.
 */

// ============================================================================
// Email Domain
// ============================================================================

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailBody {
  text: string;
  html?: string;
}

export type GmailCategory = 'primary' | 'social' | 'promotions' | 'updates' | 'forums';

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  sender: EmailAddress;
  recipients: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  dateReceived: Date;
  body: EmailBody;
  labels: string[];
  isRead: boolean;
  category?: GmailCategory;
  snippet: string;
  historyId: string;
  syncedAt: Date;
}

// ============================================================================
// Query Domain
// ============================================================================

export interface Query {
  id: string;
  name: string;
  naturalLanguageText: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  runCount: number;
}

export interface QueryResult {
  query: Query;
  emails: Email[];
  totalCount: number;
  executionTimeMs: number;
}

// ============================================================================
// Workflow Domain
// ============================================================================

export type WorkflowActionType = 'LABEL' | 'ARCHIVE' | 'DELETE';

export interface WorkflowAction {
  type: WorkflowActionType;
  params: LabelActionParams | ArchiveActionParams | DeleteActionParams;
}

export interface LabelActionParams {
  labelId: string;
  labelName: string;
}

export interface ArchiveActionParams {
  // No params needed for archive
}

export interface DeleteActionParams {
  // No params needed for delete
}

export interface Workflow {
  id: string;
  queryId: string;
  name: string;
  action: WorkflowAction;
  executionOrder: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  sessionId: string;
  startedAt: Date;
  completedAt?: Date;
  emailsMatched: number;
  emailsProcessed: number;
  status: WorkflowExecutionStatus;
  error?: string;
}

export interface WorkflowExecutionResult {
  execution: WorkflowExecution;
  processedEmails: Email[];
  failedEmails: Array<{ email: Email; error: string }>;
}

// ============================================================================
// Session Domain
// ============================================================================

export interface Session {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  lastEmailCheckAt?: Date;
  lastHistoryId?: string;
  deviceInfo?: string;
}

// ============================================================================
// Label Domain
// ============================================================================

export interface LabelColor {
  backgroundColor: string;
  textColor: string;
}

export interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: LabelColor;
  updatedAt: Date;
}

// ============================================================================
// Sorting & Filtering
// ============================================================================

export type EmailSortField = 'date' | 'sender' | 'subject' | 'label';
export type SortDirection = 'asc' | 'desc';

export interface EmailSort {
  field: EmailSortField;
  direction: SortDirection;
}

export interface EmailFilter {
  sender?: string;
  dateFrom?: Date;
  dateTo?: Date;
  labels?: string[];
  category?: GmailCategory;
  isRead?: boolean;
  searchText?: string;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Events
// ============================================================================

export type ApplicationEvent =
  | { type: 'EMAILS_SYNCED'; payload: { count: number; newCount: number } }
  | { type: 'QUERY_EXECUTED'; payload: { queryId: string; resultCount: number } }
  | { type: 'WORKFLOW_STARTED'; payload: { workflowId: string; executionId: string } }
  | { type: 'WORKFLOW_COMPLETED'; payload: { workflowId: string; executionId: string; processedCount: number } }
  | { type: 'WORKFLOW_FAILED'; payload: { workflowId: string; executionId: string; error: string } }
  | { type: 'ACTION_APPLIED'; payload: { actionType: WorkflowActionType; emailCount: number } }
  | { type: 'SESSION_STARTED'; payload: { sessionId: string } }
  | { type: 'SESSION_ENDED'; payload: { sessionId: string } };

export type EventHandler<T extends ApplicationEvent = ApplicationEvent> = (event: T) => void | Promise<void>;
