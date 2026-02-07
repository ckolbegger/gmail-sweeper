/**
 * Gmail Client
 *
 * Wrapper around Gmail API with business logic for authentication,
 * rate limiting, and local caching.
 */

import { google } from 'googleapis';
import type {
  GmailClient as GmailClientContract,
  GmailClientConfig,
  EmailListOptions,
  SyncProgress,
  SyncResult,
  BatchActionResult,
} from '../contracts/gmail-api.js';
import type { PaginatedResult } from '../contracts/types.js';
import type { Email } from '../models/email.js';
import { parseGmailMessage } from '../models/email.js';
import { AuthManager } from './auth-manager.js';
import { GmailError } from '../errors/index.js';

export class GmailClient implements GmailClientContract {
  private gmail: any;
  private rateLimiter: Map<string, number[]> = new Map();
  private readonly maxRequestsPerSecond: number;

  readonly auth: AuthManager;

  constructor(config: GmailClientConfig) {
    this.auth = new AuthManager(config);
    this.maxRequestsPerSecond = config.rateLimitRps || 10;
  }

  /**
   * Initialize Gmail API client
   */
  private async getClient(): Promise<any> {
    if (!this.gmail) {
      const token = await this.auth.getAccessToken();
      this.gmail = google.gmail({ version: 'v1' });
      this.gmail.context = {
        _options: {
          headers: { Authorization: `Bearer ${token}` },
        },
      };
    }
    return this.gmail;
  }

  /**
   * Apply rate limiting with exponential backoff
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const key = 'default';
    const requests = this.rateLimiter.get(key) || [];

    // Remove requests older than 1 second
    const recent = requests.filter((t: number) => now - t < 1000);

    if (recent.length >= this.maxRequestsPerSecond) {
      const waitTime = 1000 - (now - recent[0]) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    recent.push(now);
    this.rateLimiter.set(key, recent);
  }

  /**
   * Execute API call with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.rateLimit();
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (error.code === 429) {
          // Rate limited - use exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        if (error.code === 401) {
          // Try to refresh token
          await this.auth.refreshAccessToken();
          continue;
        }

        throw new GmailError('UNKNOWN', error.message, error);
      }
    }

    throw new GmailError('NETWORK_ERROR', 'Max retries exceeded', lastError);
  }

  /**
   * List emails from Gmail with optional filtering and sorting
   */
  async listEmails(options: EmailListOptions = {}): Promise<PaginatedResult<Email>> {
    const client = await this.getClient();
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 50;

    const response = await this.executeWithRetry(async () => {
      return client.users.messages.list({
        userId: 'me',
        maxResults: pageSize,
        pageToken: options.pageToken,
        labelIds: options.filter?.labels,
        q: options.filter?.searchText,
      });
    });

    const messages = response.data.messages || [];
    const emails: Email[] = [];

    for (const message of messages) {
      const email = await this.getEmail(message.id);
      if (email) {
        emails.push(email);
      }
    }

    return {
      items: emails,
      total: response.data.resultSizeEstimate || emails.length,
      page,
      pageSize,
      hasMore: Boolean(response.data.nextPageToken),
    };
  }

  /**
   * Get a single email by ID
   */
  async getEmail(id: string): Promise<Email | null> {
    const client = await this.getClient();

    const response = await this.executeWithRetry(async () => {
      return client.users.messages.get({
        userId: 'me',
        id: id,
        format: 'full',
      });
    });

    return parseGmailMessage(response.data);
  }

  /**
   * Get multiple emails by IDs (batch fetch)
   */
  async getEmails(ids: string[]): Promise<Email[]> {
    const emails: Email[] = [];

    for (const id of ids) {
      const email = await this.getEmail(id);
      if (email) {
        emails.push(email);
      }
    }

    return emails;
  }

  /**
   * Get full email content including body
   */
  async getEmailContent(id: string): Promise<Email | null> {
    return this.getEmail(id);
  }

  /**
   * Perform initial sync of all emails
   */
  async fullSync(
    options: {
      batchSize?: number;
      onProgress?: (progress: SyncProgress) => void;
    } = {}
  ): Promise<SyncResult> {
    const client = await this.getClient();
    const batchSize = options.batchSize || 100;
    let pageToken: string | undefined;
    let totalEmails = 0;
    let processedEmails = 0;
    let batchNumber = 0;

    // First, get estimated total
    try {
      const profile = await client.users.getProfile({ userId: 'me' });
      totalEmails = profile.data.messagesTotal || 0;
    } catch {
      totalEmails = 0;
    }

    do {
      batchNumber++;

      const response = await this.executeWithRetry(async () => {
        return client.users.messages.list({
          userId: 'me',
          maxResults: batchSize,
          pageToken: pageToken,
        });
      });

      const messages = response.data.messages || [];
      const currentBatchSize = messages.length;

      for (const message of messages) {
        await this.getEmail(message.id);
        processedEmails++;

        if (options.onProgress) {
          options.onProgress({
            total: totalEmails,
            processed: processedEmails,
            batchNumber,
            batchSize: currentBatchSize,
          });
        }
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);

    // Get current history ID
    const profile = await client.users.getProfile({ userId: 'me' });

    return {
      success: true,
      emailsAdded: processedEmails,
      emailsUpdated: 0,
      emailsDeleted: 0,
      historyId: profile.data.historyId || '',
    };
  }

  /**
   * Incremental sync using Gmail History API
   */
  async incrementalSync(options: {
    historyId: string;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult> {
    const client = await this.getClient();
    let pageToken: string | undefined;
    let emailsAdded = 0;
    let emailsUpdated = 0;
    let emailsDeleted = 0;
    let processed = 0;

    do {
      const response = await this.executeWithRetry(async () => {
        return client.users.history.list({
          userId: 'me',
          startHistoryId: options.historyId,
          pageToken: pageToken,
        });
      });

      const history = response.data.history || [];

      for (const record of history) {
        const messagesAdded = record.messagesAdded || [];
        const messagesDeleted = record.messagesDeleted || [];
        const labelsAdded = record.labelsAdded || [];
        const labelsRemoved = record.labelsRemoved || [];

        emailsAdded += messagesAdded.length;
        emailsDeleted += messagesDeleted.length;
        emailsUpdated += labelsAdded.length + labelsRemoved.length;
        processed += record.id ? 1 : 0;

        // Process added messages
        for (const item of messagesAdded) {
          await this.getEmail(item.message?.id);
        }

        // Process updated messages
        for (const item of [...labelsAdded, ...labelsRemoved]) {
          await this.getEmail(item.message?.id);
        }
      }

      if (options.onProgress) {
        options.onProgress({
          total: processed,
          processed,
          batchNumber: 1,
          batchSize: history.length,
        });
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);

    // Get current history ID
    const profile = await client.users.getProfile({ userId: 'me' });

    return {
      success: true,
      emailsAdded,
      emailsUpdated,
      emailsDeleted,
      historyId: profile.data.historyId || '',
    };
  }

  /**
   * Get the current history ID for incremental sync
   */
  async getCurrentHistoryId(): Promise<string> {
    const client = await this.getClient();
    const profile = await this.executeWithRetry(async () => {
      return client.users.getProfile({ userId: 'me' });
    });

    return profile.data.historyId || '';
  }

  /**
   * Apply a label to emails
   */
  async labelEmails(emailIds: string[], labelId: string): Promise<BatchActionResult> {
    const client = await this.getClient();
    const failures: Array<{ emailId: string; error: string }> = [];
    let successfulCount = 0;

    for (const emailId of emailIds) {
      try {
        await this.executeWithRetry(async () => {
          return client.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: {
              addLabelIds: [labelId],
            },
          });
        });
        successfulCount++;
      } catch (error: any) {
        failures.push({ emailId, error: error.message });
      }
    }

    return {
      success: failures.length === 0,
      successfulCount,
      failedCount: failures.length,
      failures,
    };
  }

  /**
   * Remove a label from emails
   */
  async removeLabel(emailIds: string[], labelId: string): Promise<BatchActionResult> {
    const client = await this.getClient();
    const failures: Array<{ emailId: string; error: string }> = [];
    let successfulCount = 0;

    for (const emailId of emailIds) {
      try {
        await this.executeWithRetry(async () => {
          return client.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: {
              removeLabelIds: [labelId],
            },
          });
        });
        successfulCount++;
      } catch (error: any) {
        failures.push({ emailId, error: error.message });
      }
    }

    return {
      success: failures.length === 0,
      successfulCount,
      failedCount: failures.length,
      failures,
    };
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
    const client = await this.getClient();
    const failures: Array<{ emailId: string; error: string }> = [];
    let successfulCount = 0;

    for (const emailId of emailIds) {
      try {
        await this.executeWithRetry(async () => {
          return client.users.messages.trash({
            userId: 'me',
            id: emailId,
          });
        });
        successfulCount++;
      } catch (error: any) {
        failures.push({ emailId, error: error.message });
      }
    }

    return {
      success: failures.length === 0,
      successfulCount,
      failedCount: failures.length,
      failures,
    };
  }

  /**
   * Mark emails as read/unread
   */
  async markAsRead(emailIds: string[], isRead: boolean): Promise<BatchActionResult> {
    const client = await this.getClient();
    const label = isRead ? 'UNREAD' : 'UNREAD';
    const failures: Array<{ emailId: string; error: string }> = [];
    let successfulCount = 0;

    for (const emailId of emailIds) {
      try {
        await this.executeWithRetry(async () => {
          return client.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: isRead ? { removeLabelIds: [label] } : { addLabelIds: [label] },
          });
        });
        successfulCount++;
      } catch (error: any) {
        failures.push({ emailId, error: error.message });
      }
    }

    return {
      success: failures.length === 0,
      successfulCount,
      failedCount: failures.length,
      failures,
    };
  }
}
