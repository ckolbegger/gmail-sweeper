/**
 * Shared Type Definitions
 *
 * Core domain types used across the application.
 */

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  /** Number of items per page (default: 50) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

export interface PaginatedResult<T> {
  /** Items for current page */
  items: T[];
  /** Total count of all items */
  total: number;
  /** Current offset */
  offset: number;
  /** Current limit */
  limit: number;
  /** Whether there are more items */
  hasMore: boolean;
  /** Next page token for API pagination */
  nextPageToken?: string;
}

// ============================================================================
// Email Types
// ============================================================================

export interface EmailAddress {
  /** Display name */
  name?: string;
  /** Email address */
  email: string;
}

export interface EmailBody {
  /** Plain text content */
  text: string;
  /** HTML content (if available) */
  html?: string;
}

export type GmailCategory = 'primary' | 'social' | 'promotions' | 'updates' | 'forums';

export interface Email {
  /** Gmail message ID (primary key) */
  id: string;
  /** Gmail thread ID */
  threadId: string;
  /** Email subject line */
  subject: string;
  /** From address */
  sender: EmailAddress;
  /** To addresses */
  recipients: EmailAddress[];
  /** CC addresses */
  cc: EmailAddress[];
  /** BCC addresses (if available) */
  bcc: EmailAddress[];
  /** Received timestamp */
  dateReceived: Date;
  /** Plain text and HTML content */
  body: EmailBody;
  /** Gmail label IDs */
  labels: string[];
  /** Read status */
  isRead: boolean;
  /** Gmail category (if classified) */
  category?: GmailCategory;
  /** Brief preview text */
  snippet: string;
  /** Gmail history ID for sync */
  historyId: string;
  /** Last sync timestamp */
  syncedAt: Date;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

export interface DateRangeFilter {
  /** Start date for range */
  start?: Date;
  /** End date for range */
  end?: Date;
}

export interface EmailFilter {
  /** Filter by sender email */
  sender?: string;
  /** Filter by date range start (legacy) */
  dateFrom?: Date;
  /** Filter by date range end (legacy) */
  dateTo?: Date;
  /** Filter by date range (new) */
  dateRange?: DateRangeFilter;
  /** Filter by label IDs (OR logic) */
  labels?: string[];
  /** Filter by single label */
  label?: string;
  /** Filter by read status */
  isRead?: boolean;
  /** Filter by category */
  category?: GmailCategory;
  /** Full-text search query */
  searchText?: string;
  /** Filter by subject containing text */
  subject?: string;
  /** Filter by thread ID */
  threadId?: string;
}

export type SortField = 'date' | 'sender' | 'subject';
export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

// ============================================================================
// Label Types
// ============================================================================

export interface LabelColor {
  backgroundColor: string;
  textColor: string;
}

export interface Label {
  /** Gmail label ID (primary key) */
  id: string;
  /** Label name */
  name: string;
  /** System label or user-created */
  type: 'system' | 'user';
  /** Label color if set */
  color?: LabelColor;
  /** Last sync timestamp */
  updatedAt: Date;
}

// ============================================================================
// Query Types
// ============================================================================

export interface Query {
  /** UUID (primary key) */
  id: string;
  /** User-friendly name */
  name: string;
  /** The NL query (e.g., "financial offers") */
  naturalLanguageText: string;
  /** Optional description */
  description?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last execution timestamp */
  lastRunAt?: Date;
  /** Number of times executed */
  runCount: number;
}

// ============================================================================
// Workflow Types
// ============================================================================

export type WorkflowActionType = 'LABEL' | 'ARCHIVE' | 'DELETE';

export interface WorkflowAction {
  type: WorkflowActionType;
  params: Record<string, unknown>;
}

export interface LabelWorkflowAction extends WorkflowAction {
  type: 'LABEL';
  params: {
    labelId: string;
    labelName: string;
  };
}

export interface ArchiveWorkflowAction extends WorkflowAction {
  type: 'ARCHIVE';
  params: Record<string, never>;
}

export interface DeleteWorkflowAction extends WorkflowAction {
  type: 'DELETE';
  params: Record<string, never>;
}

export interface Workflow {
  /** UUID (primary key) */
  id: string;
  /** Foreign key to Query */
  queryId: string;
  /** Display name */
  name: string;
  /** Action to perform on matches */
  action: WorkflowAction;
  /** Order in workflow chain */
  executionOrder: number;
  /** Whether to run automatically */
  isEnabled: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

export interface WorkflowExecution {
  /** UUID (primary key) */
  id: string;
  /** Foreign key to Workflow */
  workflowId: string;
  /** Foreign key to Session */
  sessionId: string;
  /** Execution start time */
  startedAt: Date;
  /** Execution end time */
  completedAt?: Date;
  /** Number of emails matching query */
  emailsMatched: number;
  /** Number of emails action applied to */
  emailsProcessed: number;
  /** Execution status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
  /** UUID (primary key) */
  id: string;
  /** Session start time */
  startedAt: Date;
  /** Session end time */
  endedAt?: Date;
  /** Last time emails were checked */
  lastEmailCheckAt?: Date;
  /** Gmail history ID at last sync */
  lastHistoryId?: string;
  /** Optional device identifier */
  deviceInfo?: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncProgress {
  /** Total count of all items */
  totalCount: number;
  /** Emails processed so far */
  processedCount: number;
  /** Current batch number */
  currentBatch: number;
  /** Total number of batches */
  totalBatches: number;
}

export interface SyncResult {
  /** Synced emails */
  emails: Email[];
  /** History ID to use for next incremental sync */
  historyId: string;
  /** Sync completion timestamp */
  syncedAt: Date;
}

// ============================================================================
// Batch Operations
// ============================================================================

export interface BatchActionResult {
  /** Whether the batch operation completed successfully */
  success: boolean;
  /** Number of emails successfully processed */
  processedCount: number;
  /** Number of emails that failed */
  failedCount: number;
  /** Error details for failed emails */
  errors: Array<{ emailId: string; error: string }>;
}
