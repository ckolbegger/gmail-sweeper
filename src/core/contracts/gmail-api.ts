/**
 * Gmail API Contract
 *
 * Defines the interface for Gmail API operations. The implementation wraps
 * the googleapis library with business logic for authentication, rate limiting,
 * and local caching.
 */

import type { Email, EmailFilter, Label, PaginatedResult, PaginationParams } from './types.js';

// ============================================================================
// Authentication
// ============================================================================

export interface AuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

export interface AuthManager {
  /** Check if user is authenticated */
  isAuthenticated(): Promise<boolean>;

  /** Get authorization URL for OAuth2 flow */
  getAuthUrl(): Promise<string>;

  /** Exchange authorization code for tokens */
  exchangeCode(code: string): Promise<AuthCredentials>;

  /** Get valid access token (refreshing if necessary) */
  getAccessToken(): Promise<string>;

  /** Revoke authentication */
  revokeAuth(): Promise<void>;

  /** Listen for token refresh events */
  onTokenRefresh(handler: (credentials: AuthCredentials) => void): void;
}

// ============================================================================
// Email Operations
// ============================================================================

export interface EmailListOptions extends PaginationParams {
  filter?: EmailFilter;
  sort?: {
    field: 'date' | 'sender' | 'subject';
    direction: 'asc' | 'desc';
  };
}

export interface GmailClient {
  /** Authentication manager */
  readonly auth: AuthManager;

  // -------------------------------------------------------------------------
  // Email Fetching
  // -------------------------------------------------------------------------

  /**
   * List emails from Gmail with optional filtering and sorting.
   * Uses local cache first, fetches from API if needed.
   */
  listEmails(options: EmailListOptions): Promise<PaginatedResult<Email>>;

  /**
   * Get a single email by ID.
   * Checks local cache first, falls back to API.
   */
  getEmail(id: string): Promise<Email | null>;

  /**
   * Get multiple emails by IDs (batch fetch).
   * More efficient than individual getEmail calls.
   */
  getEmails(ids: string[]): Promise<Email[]>;

  /**
   * Get full email content including body.
   * Use when snippet is insufficient.
   */
  getEmailContent(id: string): Promise<Email | null>;

  // -------------------------------------------------------------------------
  // Sync Operations
  // -------------------------------------------------------------------------

  /**
   * Perform initial sync of all emails.
   * Fetches emails in batches and stores locally.
   *
   * @param onProgress - Called after each batch with progress info
   */
  fullSync(options: {
    batchSize?: number;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult>;

  /**
   * Incremental sync using Gmail History API.
   * Only fetches changes since last sync.
   */
  incrementalSync(options: {
    historyId: string;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult>;

  /**
   * Get the current history ID for incremental sync.
   */
  getCurrentHistoryId(): Promise<string>;

  // -------------------------------------------------------------------------
  // Email Actions
  // -------------------------------------------------------------------------

  /**
   * Apply a label to emails.
   */
  labelEmails(emailIds: string[], labelId: string): Promise<BatchActionResult>;

  /**
   * Remove a label from emails.
   */
  removeLabel(emailIds: string[], labelId: string): Promise<BatchActionResult>;

  /**
   * Archive emails (remove INBOX label).
   */
  archiveEmails(emailIds: string[]): Promise<BatchActionResult>;

  /**
   * Delete emails (move to trash).
   */
  deleteEmails(emailIds: string[]): Promise<BatchActionResult>;

  /**
   * Mark emails as read/unread.
   */
  markAsRead(emailIds: string[], isRead: boolean): Promise<BatchActionResult>;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncProgress {
  /** Total emails to sync (estimated) */
  total: number;

  /** Emails processed so far */
  processed: number;

  /** Current batch number */
  batchNumber: number;

  /** Emails in current batch */
  batchSize: number;
}

export interface SyncResult {
  /** Whether sync completed successfully */
  success: boolean;

  /** New emails synced */
  emailsAdded: number;

  /** Emails updated (labels, read status) */
  emailsUpdated: number;

  /** Emails deleted remotely */
  emailsDeleted: number;

  /** History ID to use for next incremental sync */
  historyId: string;

  /** Error message if sync failed */
  error?: string;
}

// ============================================================================
// Batch Operations
// ============================================================================

export interface BatchActionResult {
  /** Whether the batch operation completed */
  success: boolean;

  /** Number of emails successfully processed */
  successfulCount: number;

  /** Number of emails that failed */
  failedCount: number;

  /** Details of failures */
  failures: Array<{ emailId: string; error: string }>;
}

// ============================================================================
// Label Operations
// ============================================================================

export interface LabelManager {
  /**
   * Get all labels from Gmail.
   * Merges system and user labels.
   */
  getLabels(): Promise<Label[]>;

  /**
   * Get a specific label by ID.
   */
  getLabel(id: string): Promise<Label | null>;

  /**
   * Create a new user label.
   */
  createLabel(name: string, options?: { color?: LabelColor }): Promise<Label>;

  /**
   * Update an existing label.
   */
  updateLabel(id: string, updates: { name?: string; color?: LabelColor }): Promise<Label>;

  /**
   * Delete a user label.
   */
  deleteLabel(id: string): Promise<void>;

  /**
   * Sync labels from Gmail to local cache.
   */
  syncLabels(): Promise<void>;
}

export interface LabelColor {
  backgroundColor: string;
  textColor: string;
}

// ============================================================================
// Error Types
// ============================================================================

export type GmailErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class GmailError extends Error {
  constructor(
    public readonly code: GmailErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GmailError';
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface GmailClientConfig {
  /** OAuth2 client ID */
  clientId: string;

  /** OAuth2 client secret */
  clientSecret: string;

  /** OAuth2 redirect URI */
  redirectUri: string;

  /** OAuth2 scopes to request */
  scopes?: string[];

  /** Rate limit: max requests per second (default: 10) */
  rateLimitRps?: number;

  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

// Default scopes needed for the application
export const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels'
];
