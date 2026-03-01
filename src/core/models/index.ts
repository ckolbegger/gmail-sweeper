/**
 * Core domain models for Gmail Sweep.
 * These types are frontend-agnostic and define the core data structures.
 */

/**
 * T008: EmailAddress interface
 * Represents an email address with optional display name.
 */
export interface EmailAddress {
  /** Email address (e.g., user@example.com) */
  email: string;
  /** Display name (e.g., "John Doe") */
  name?: string;
}

/**
 * T009: Label types
 * Gmail label type - system labels are built-in, user labels are custom.
 */
export type LabelType = 'system' | 'user';

/**
 * T009: Label interface
 * Represents a Gmail label for categorization.
 */
export interface Label {
  /** Gmail label ID */
  id: string;
  /** Label name (e.g., "Work", "Personal") */
  name: string;
  /** System or user-created label */
  type: LabelType;
  /** Hex color code (user labels only) */
  color?: string;
}

/**
 * T010: Category type
 * Gmail's automatic categorization.
 */
export type Category = 'primary' | 'social' | 'promotions' | 'updates' | 'forums';

/**
 * T007: Email interface
 * Represents a Gmail message with metadata for display and actions.
 */
export interface Email {
  /** Gmail message ID */
  id: string;
  /** Gmail thread ID */
  threadId: string;
  /** Email subject line */
  subject: string;
  /** From address */
  sender: EmailAddress;
  /** To/CC addresses */
  recipients: EmailAddress[];
  /** Send/receive timestamp */
  date: Date;
  /** Preview text (first ~100 chars) */
  snippet: string;
  /** Plain text body (lazy loaded) */
  bodyText?: string;
  /** HTML body (lazy loaded) */
  bodyHtml?: string;
  /** Applied Gmail labels */
  labels: Label[];
  /** Gmail category */
  category?: Category;
  /** Read/unread status */
  isRead: boolean;
  /** Starred status */
  isStarred: boolean;
  /** Has attachments */
  hasAttachments: boolean;
}

/**
 * Action type for email operations (US4, TUI Fast Follow).
 */
export type Action =
  | { type: 'applyLabel'; labelId: string }
  | { type: 'archive' }
  | { type: 'delete' };

/**
 * Classification result from NL search (US3).
 */
export interface ClassificationResult {
  /** Email ID */
  emailId: string;
  /** Whether email matches query */
  matches: boolean;
  /** Confidence score (0.0-1.0) */
  confidence: number;
  /** Optional explanation */
  reasoning?: string;
}

/**
 * Natural language query for semantic email matching.
 */
export interface NaturalLanguageQuery {
  /** Raw query text */
  text: string;
  /** When query was executed */
  timestamp: Date;
  /** Number of matching emails */
  resultsCount: number;
}

/**
 * Saved query with optional associated action (TUI Fast Follow).
 */
export interface SavedQuery {
  /** Unique identifier (UUID) */
  id: string;
  /** User-defined name */
  name: string;
  /** Natural language query */
  queryText: string;
  /** Optional action to apply */
  action?: Action;
  /** Execution order (for session start) */
  order: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last execution timestamp */
  lastRun?: Date;
  /** Emails matched on last run */
  lastRunCount: number;
}

/**
 * T011: Config interface
 * User configuration.
 */
export interface Config {
  /** Gmail account email */
  gmailAccount: string;
  /** Emails to load on start (default: 50) */
  initialLoadSize: number;
  /** LLM provider for classification */
  llmProvider: 'claude' | 'gemini';
  /** Env var name for API key */
  llmApiKeyEnv: string;
  /** TUI/web theme */
  theme: string;
  /** Require confirmation for archive/delete */
  confirmDestructive: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: Config = {
  gmailAccount: '',
  initialLoadSize: 50,
  llmProvider: 'claude',
  llmApiKeyEnv: 'ANTHROPIC_API_KEY',
  theme: 'default',
  confirmDestructive: true,
};

/**
 * User session state for saved query prompts.
 */
export interface UserSession {
  /** Gmail account email */
  userEmail: string;
  /** Last session end time */
  lastSession: Date;
  /** Last email sync timestamp */
  lastEmailSync: Date;
}

/**
 * Options for listing messages from Gmail.
 */
export interface MessageListOptions {
  /** Gmail search query */
  query?: string;
  /** Max messages to return (default 50) */
  maxResults?: number;
  /** Token for next page (pagination) */
  pageToken?: string;
  /** Filter by label IDs (default: ['INBOX']) */
  labels?: string[];
}

/**
 * Result from listing messages.
 */
export interface MessageListResult {
  /** List of emails */
  messages: Email[];
  /** Token for next page */
  nextPageToken?: string;
  /** Total estimated messages */
  totalEstimate: number;
}

/**
 * Result from batch operations.
 */
export interface BatchResult {
  /** Successfully processed message IDs */
  succeeded: string[];
  /** Failed operations */
  failed: Array<{ id: string; error: string }>;
}

/**
 * Options for querying cached emails.
 */
export interface EmailCacheOptions {
  /** Max emails to return */
  limit?: number;
  /** Skip first N emails */
  offset?: number;
  /** Sort field */
  sortBy?: 'date' | 'sender' | 'subject';
  /** Sort descending (default: true for date) */
  sortDesc?: boolean;
  /** Filter by label ID */
  labelFilter?: string;
  /** Filter by category */
  categoryFilter?: Category;
}

/**
 * Result from search operation.
 */
export interface SearchResult {
  /** Original query */
  query: string;
  /** Matching emails */
  matches: Email[];
  /** Total emails scanned */
  totalScanned: number;
  /** Search duration in milliseconds */
  durationMs: number;
}

/**
 * Result from action execution.
 */
export interface ActionResult {
  /** Action type performed */
  action: string;
  /** Number of successful operations */
  succeeded: number;
  /** Number of failed operations */
  failed: number;
  /** Error messages */
  errors: string[];
}

/**
 * Action type for email action keys feature.
 */
export type ActionType = 'archive' | 'delete';

/**
 * Result of a single email action (archive/delete) for UI state.
 */
export interface EmailActionResult {
  /** Result type */
  type: 'success' | 'failure' | 'confirmation-required';
  /** Email ID acted upon */
  emailId: string;
  /** Action performed */
  action: ActionType;
  /** Error message (present only for failure) */
  error?: string;
}

/**
 * State managed by useEmailActions hook.
 */
export interface EmailActionState {
  /** Whether an action is in progress */
  isProcessing: boolean;
  /** Last action result */
  lastAction: EmailActionResult | null;
  /** Whether delete confirmation is shown */
  showDeleteConfirmation: boolean;
  /** Email ID pending confirmation */
  confirmationTargetEmailId: string | null;
}
