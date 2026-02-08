/**
 * GmailClient
 *
 * Gmail API client for fetching and managing emails.
 */

import { google, gmail_v1 } from 'googleapis';
import type {
  GmailClient,
  AuthManager,
  EmailListOptions,
} from '../contracts/gmail-api.js';
import type { Email, EmailAddress, PaginatedResult, SyncProgress, SyncResult, BatchActionResult } from '../contracts/types.js';
import { GmailError } from '../errors/index.js';
import { logger } from '../logging/index.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_RATE_LIMIT_RPS = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// Types
// ============================================================================

interface GmailClientConfig {
  authManager: AuthManager;
  rateLimitRps?: number;
  batchSize?: number;
}

// ============================================================================
// GmailClient Implementation
// ============================================================================

export class GmailClientImpl implements GmailClient {
  private gmail: gmail_v1.Gmail | null = null;
  readonly auth: AuthManager;
  private rateLimitRps: number;
  private batchSize: number;
  private lastRequestTime: number = 0;

  constructor(config: GmailClientConfig) {
    this.auth = config.authManager;
    this.rateLimitRps = config.rateLimitRps || DEFAULT_RATE_LIMIT_RPS;
    this.batchSize = config.batchSize || DEFAULT_BATCH_SIZE;
  }

  /**
   * Initialize the Gmail API client
   */
  private async initialize(): Promise<void> {
    if (this.gmail) {
      return;
    }

    const isAuthenticated = await this.auth.isAuthenticated();
    if (!isAuthenticated) {
      throw new GmailError('AUTH_REQUIRED', 'Not authenticated. Please run "gmail-sweep auth" first.');
    }

    const accessToken = await this.auth.getAccessToken();

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    this.gmail = google.gmail({ version: 'v1', auth });
    logger.debug('Gmail API client initialized');
  }

  /**
   * Rate limit requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const minInterval = 1000 / this.rateLimitRps;
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute API call with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.rateLimit();
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
          logger.warn(`Rate limited on ${operationName}, retrying in ${delay}ms (attempt ${attempt})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Not retryable
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as { code?: number; message?: string };
      return err.code === 429 || (err.message?.includes('Rate limit') ?? false);
    }
    return false;
  }

  /**
   * Check if error is a not found error
   */
  private isNotFoundError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as { code?: number };
      return err.code === 404;
    }
    return false;
  }

  /**
   * List emails from Gmail
   */
  async listEmails(options: EmailListOptions): Promise<PaginatedResult<Email>> {
    await this.initialize();

    try {
      const response = await this.executeWithRetry(
        () =>
          this.gmail!.users.messages.list({
            userId: 'me',
            maxResults: options.maxResults || this.batchSize,
            pageToken: options.pageToken,
            q: options.q,
            labelIds: options.labelIds,
          }),
        'listEmails'
      );

      const messages = response.data.messages || [];
      const nextPageToken = response.data.nextPageToken || undefined;
      const totalEstimate = response.data.resultSizeEstimate || messages.length;

      // Fetch full email data for each message
      const emails: Email[] = [];
      for (const message of messages) {
        if (message.id) {
          const email = await this.getEmail(message.id);
          if (email) {
            emails.push(email);
          }
        }
      }

      return {
        items: emails,
        total: totalEstimate,
        offset: 0,
        limit: options.limit || this.batchSize,
        hasMore: !!nextPageToken,
      };
    } catch (error) {
      logger.error('Failed to list emails', error);
      throw new GmailError(
        'NETWORK_ERROR',
        `Failed to list emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get a single email by ID
   */
  async getEmail(id: string): Promise<Email | null> {
    await this.initialize();

    try {
      const response = await this.executeWithRetry(
        () =>
          this.gmail!.users.messages.get({
            userId: 'me',
            id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'To', 'Date', 'Cc', 'Bcc'],
          }),
        'getEmail'
      );

      return this.parseMessage(response.data);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      logger.error(`Failed to get email ${id}`, error);
      throw new GmailError(
        'NETWORK_ERROR',
        `Failed to get email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get multiple emails by IDs
   */
  async getEmails(ids: string[]): Promise<Email[]> {
    await this.initialize();

    // Fetch emails in parallel with rate limiting
    const emails: Email[] = [];
    for (const id of ids) {
      try {
        const email = await this.getEmail(id);
        if (email) {
          emails.push(email);
        }
      } catch (error) {
        logger.error(`Failed to get email ${id}`, error);
        // Continue with other emails
      }
    }

    return emails;
  }

  /**
   * Get full email content including body
   */
  async getEmailContent(id: string): Promise<Email | null> {
    await this.initialize();

    try {
      const response = await this.executeWithRetry(
        () =>
          this.gmail!.users.messages.get({
            userId: 'me',
            id,
            format: 'full',
          }),
        'getEmailContent'
      );

      return this.parseMessage(response.data, true);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      logger.error(`Failed to get email content ${id}`, error);
      throw new GmailError(
        'NETWORK_ERROR',
        `Failed to get email content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get current history ID for incremental sync
   */
  async getCurrentHistoryId(): Promise<string> {
    await this.initialize();

    try {
      const response = await this.executeWithRetry(
        () =>
          this.gmail!.users.getProfile({
            userId: 'me',
          }),
        'getProfile'
      );

      const historyId = response.data.historyId;
      if (!historyId) {
        throw new GmailError('UNKNOWN', 'Failed to get history ID from profile');
      }

      return historyId;
    } catch (error) {
      logger.error('Failed to get current history ID', error);
      throw new GmailError(
        'NETWORK_ERROR',
        `Failed to get history ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Perform full sync of all emails
   */
  async fullSync(options: {
    batchSize?: number;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult> {
    await this.initialize();

    const batchSize = options.batchSize || this.batchSize;
    const emails: Email[] = [];
    let pageToken: string | undefined;
    let processedCount = 0;
    let hasMore = true;

    logger.info('Starting full sync');

    try {
      while (hasMore) {
        const result = await this.listEmails({
          maxResults: batchSize,
          pageToken,
        });

        emails.push(...result.items);
        processedCount += result.items.length;
        pageToken = result.nextPageToken;
        hasMore = result.hasMore;

        if (options.onProgress) {
          options.onProgress({
            processedCount,
            totalCount: result.total,
            currentBatch: Math.ceil(processedCount / batchSize),
            totalBatches: Math.ceil(result.total / batchSize),
          });
        }

        logger.debug(`Full sync progress: ${processedCount} emails processed`);
      }

      const historyId = await this.getCurrentHistoryId();

      logger.info(`Full sync complete: ${processedCount} emails synced`);

      return {
        emails,
        historyId,
        syncedAt: new Date(),
      };
    } catch (error) {
      logger.error('Full sync failed', error);
      throw error;
    }
  }

  /**
   * Incremental sync using Gmail History API
   */
  async incrementalSync(options: {
    historyId: string;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult> {
    await this.initialize();

    logger.info(`Starting incremental sync from history ID ${options.historyId}`);

    try {
      const response = await this.executeWithRetry(
        () =>
          this.gmail!.users.history.list({
            userId: 'me',
            startHistoryId: options.historyId,
          }),
        'history.list'
      );

      const history = response.data.history || [];
      const emailIds = new Set<string>();

      // Extract message IDs from history
      for (const item of history) {
        if (item.messagesAdded) {
          for (const msg of item.messagesAdded) {
            if (msg.message?.id) {
              emailIds.add(msg.message.id);
            }
          }
        }
        if (item.labelsAdded || item.labelsRemoved) {
          // Include messages with label changes
          const labelChanges = [...(item.labelsAdded || []), ...(item.labelsRemoved || [])];
          for (const change of labelChanges) {
            if (change.message?.id) {
              emailIds.add(change.message.id);
            }
          }
        }
      }

      // Fetch full email data
      const emails: Email[] = [];
      const ids = Array.from(emailIds);

      for (let i = 0; i < ids.length; i += this.batchSize) {
        const batch = ids.slice(i, i + this.batchSize);
        const batchEmails = await this.getEmails(batch);
        emails.push(...batchEmails);

        if (options.onProgress) {
          options.onProgress({
            processedCount: emails.length,
            totalCount: ids.length,
            currentBatch: Math.ceil(emails.length / this.batchSize),
            totalBatches: Math.ceil(ids.length / this.batchSize),
          });
        }
      }

      const newHistoryId = await this.getCurrentHistoryId();

      logger.info(`Incremental sync complete: ${emails.length} emails updated`);

      return {
        emails,
        historyId: newHistoryId,
        syncedAt: new Date(),
      };
    } catch (error) {
      logger.error('Incremental sync failed', error);
      throw error;
    }
  }

  /**
   * Apply a label to emails
   */
  async labelEmails(emailIds: string[], labelId: string): Promise<BatchActionResult> {
    await this.initialize();

    const result: BatchActionResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const id of emailIds) {
      try {
        await this.executeWithRetry(
          () =>
            this.gmail!.users.messages.modify({
              userId: 'me',
              id,
              requestBody: {
                addLabelIds: [labelId],
              },
            }),
          `labelEmail-${id}`
        );
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          emailId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error(`Failed to label email ${id}`, error);
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Remove a label from emails
   */
  async removeLabel(emailIds: string[], labelId: string): Promise<BatchActionResult> {
    await this.initialize();

    const result: BatchActionResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const id of emailIds) {
      try {
        await this.executeWithRetry(
          () =>
            this.gmail!.users.messages.modify({
              userId: 'me',
              id,
              requestBody: {
                removeLabelIds: [labelId],
              },
            }),
          `removeLabel-${id}`
        );
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          emailId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error(`Failed to remove label from email ${id}`, error);
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Archive emails (remove INBOX label)
   */
  async archiveEmails(emailIds: string[]): Promise<BatchActionResult> {
    return this.removeLabel(emailIds, 'INBOX');
  }

  /**
   * Delete emails (move to trash)
   */
  async deleteEmails(emailIds: string[]): Promise<BatchActionResult> {
    await this.initialize();

    const result: BatchActionResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const id of emailIds) {
      try {
        await this.executeWithRetry(
          () =>
            this.gmail!.users.messages.trash({
              userId: 'me',
              id,
            }),
          `trashEmail-${id}`
        );
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          emailId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error(`Failed to delete email ${id}`, error);
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Mark emails as read/unread
   */
  async markAsRead(emailIds: string[], isRead: boolean): Promise<BatchActionResult> {
    await this.initialize();

    const result: BatchActionResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const id of emailIds) {
      try {
        await this.executeWithRetry(
          () =>
            this.gmail!.users.messages.modify({
              userId: 'me',
              id,
              requestBody: {
                removeLabelIds: isRead ? ['UNREAD'] : undefined,
                addLabelIds: isRead ? undefined : ['UNREAD'],
              },
            }),
          `markAsRead-${id}`
        );
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          emailId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error(`Failed to mark email ${id} as ${isRead ? 'read' : 'unread'}`, error);
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Parse Gmail API message to Email model
   */
  private parseMessage(message: gmail_v1.Schema$Message, includeBody = false): Email | null {
    if (!message.id) {
      return null;
    }

    const headers = message.payload?.headers || [];
    const getHeader = (name: string): string | undefined => {
      const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value ?? undefined;
    };

    const subject = getHeader('Subject') || '(no subject)';
    const from = getHeader('From') || '';
    const to = getHeader('To') || '';
    const cc = getHeader('Cc') || '';
    const bcc = getHeader('Bcc') || '';
    const date = getHeader('Date');

    // Parse sender
    const sender = this.parseEmailAddress(from);

    // Parse recipients
    const recipients = this.parseEmailList(to);
    const ccList = this.parseEmailList(cc);
    const bccList = this.parseEmailList(bcc);

    // Parse body
    let textBody = '';
    let htmlBody: string | undefined;

    if (includeBody && message.payload) {
      const parts = this.getMessageParts(message.payload);
      textBody = parts.text || '';
      htmlBody = parts.html;
    }

    // Parse labels
    const labelIds = message.labelIds || [];
    const isRead = !labelIds.includes('UNREAD');

    // Determine category from labels
    const categoryLabel = labelIds.find((id) => id.startsWith('CATEGORY_'));
    const category = categoryLabel
      ? (categoryLabel.replace('CATEGORY_', '').toLowerCase() as Email['category'])
      : undefined;

    return {
      id: message.id,
      threadId: message.threadId || message.id,
      subject,
      sender,
      recipients,
      cc: ccList,
      bcc: bccList,
      dateReceived: date ? new Date(date) : new Date(parseInt(message.internalDate || '0')),
      body: {
        text: textBody,
        html: htmlBody,
      },
      labels: labelIds,
      isRead,
      category,
      snippet: message.snippet || '',
      historyId: message.historyId ?? '',
      syncedAt: new Date(),
    };
  }

  /**
   * Parse email address string
   */
  private parseEmailAddress(address: string): EmailAddress {
    // Handle "Name <email@example.com>" format
    const match = address.match(/^(.*?)\s*<(.+)>$/);
    if (match) {
      return {
        name: match[1].trim() || undefined,
        email: match[2].trim(),
      };
    }
    return { email: address.trim() };
  }

  /**
   * Parse comma-separated email list
   */
  private parseEmailList(addresses: string): EmailAddress[] {
    if (!addresses) return [];
    return addresses.split(',').map((addr) => this.parseEmailAddress(addr.trim()));
  }

  /**
   * Extract message parts (text and HTML)
   */
  private getMessageParts(payload: gmail_v1.Schema$MessagePart): { text?: string; html?: string } {
    let text: string | undefined;
    let html: string | undefined;

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      text = this.decodeBase64(payload.body.data);
    } else if (payload.mimeType === 'text/html' && payload.body?.data) {
      html = this.decodeBase64(payload.body.data);
    } else if (payload.parts) {
      for (const part of payload.parts) {
        const parts = this.getMessageParts(part);
        if (parts.text && !text) text = parts.text;
        if (parts.html && !html) html = parts.html;
      }
    }

    return { text, html };
  }

  /**
   * Decode base64url encoded string
   */
  private decodeBase64(data: string): string {
    // Gmail uses base64url encoding
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = padding ? normalized + '='.repeat(4 - padding) : normalized;
    return Buffer.from(padded, 'base64').toString('utf-8');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGmailClient(
  authManager: AuthManager,
  options?: { rateLimitRps?: number; batchSize?: number }
): GmailClient {
  return new GmailClientImpl({
    authManager,
    rateLimitRps: options?.rateLimitRps,
    batchSize: options?.batchSize,
  });
}
