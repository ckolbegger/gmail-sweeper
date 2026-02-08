/**
 * Gmail API Contract
 *
 * Defines the interface for Gmail API operations.
 */

import type {
  Email,
  EmailFilter,
  Label,
  PaginatedResult,
  PaginationParams,
  SortOptions,
  SyncProgress,
  SyncResult,
  BatchActionResult,
  LabelColor,
} from './types.js';

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
  sort?: SortOptions;
  /** Gmail API query string (e.g., "from:sender@example.com") */
  q?: string;
  /** Gmail label IDs to filter by */
  labelIds?: string[];
  /** Page token for pagination */
  pageToken?: string;
  /** Maximum results to return (default: 100) */
  maxResults?: number;
}

export interface GmailClient {
  /** Authentication manager */
  readonly auth: AuthManager;

  /**
   * List emails from Gmail with optional filtering and sorting.
   */
  listEmails(options: EmailListOptions): Promise<PaginatedResult<Email>>;

  /**
   * Get a single email by ID.
   */
  getEmail(id: string): Promise<Email | null>;

  /**
   * Get multiple emails by IDs (batch fetch).
   */
  getEmails(ids: string[]): Promise<Email[]>;

  /**
   * Get full email content including body.
   */
  getEmailContent(id: string): Promise<Email | null>;

  /**
   * Perform initial sync of all emails.
   */
  fullSync(options: {
    batchSize?: number;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult>;

  /**
   * Incremental sync using Gmail History API.
   */
  incrementalSync(options: {
    historyId: string;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult>;

  /**
   * Get the current history ID for incremental sync.
   */
  getCurrentHistoryId(): Promise<string>;

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
// Label Operations
// ============================================================================

export interface LabelManager {
  /**
   * Get all labels from Gmail.
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

export const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];
