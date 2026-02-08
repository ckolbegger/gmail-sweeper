/**
 * T022-T025: Gmail API client implementation.
 */

import { google, type gmail_v1 } from 'googleapis';
import pRetry, { AbortError } from 'p-retry';
import type { Auth } from 'googleapis';
import {
  AuthenticationError,
  GmailAPIError,
  RateLimitError,
  NotFoundError,
} from '../errors.js';
import type {
  Email,
  EmailAddress,
  Label,
  LabelType,
  MessageListOptions,
  MessageListResult,
  BatchResult,
  Category,
} from '../models/index.js';
import { getAuthenticatedClient, type OAuth2Credentials } from './auth.js';

/** Default number of messages to fetch per page */
const DEFAULT_MAX_RESULTS = 50;

/** Maximum retry attempts for transient errors */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_DELAY_MS = 1000;

/**
 * T022: Gmail API client for interacting with Gmail.
 */
export class GmailClient {
  private gmail: gmail_v1.Gmail | null = null;
  private auth: Auth.OAuth2Client | null = null;
  private readonly _account: string;
  private readonly configDir: string;
  private credentials: OAuth2Credentials | null = null;

  /**
   * T022: Creates a new GmailClient instance.
   * @param account - Gmail account email address
   * @param configDir - Path to configuration directory for token storage
   */
  constructor(account: string, configDir: string) {
    this._account = account;
    this.configDir = configDir;
  }

  /** Gets the configured account email */
  get account(): string {
    return this._account;
  }

  /**
   * Sets OAuth2 credentials for authentication.
   */
  setCredentials(credentials: OAuth2Credentials): void {
    this.credentials = credentials;
  }

  /**
   * T023: Authenticates with Gmail API using OAuth2.
   * @param inputFn - Optional function to get user input for interactive auth
   * @returns true if authentication succeeded
   * @throws AuthenticationError if authentication fails
   */
  async authenticate(inputFn?: (prompt: string) => Promise<string>): Promise<boolean> {
    try {
      if (!this.credentials) {
        // Use default credentials from environment or config
        this.credentials = {
          clientId: process.env['GMAIL_CLIENT_ID'] ?? '',
          clientSecret: process.env['GMAIL_CLIENT_SECRET'] ?? '',
          redirectUri: process.env['GMAIL_REDIRECT_URI'] ?? 'http://localhost:3000/callback',
        };
      }

      this.auth = await getAuthenticatedClient(this.credentials, this.configDir, inputFn);
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * T024: Lists messages from the inbox with optional filtering.
   * @param options - List options including query, pagination, and filters
   * @returns List result with messages and pagination token
   * @throws GmailAPIError on API failure
   * @throws RateLimitError if rate limit exceeded
   * @throws AuthenticationError if not authenticated
   */
  async listMessages(options: MessageListOptions = {}): Promise<MessageListResult> {
    this.ensureAuthenticated();

    const { query, maxResults = DEFAULT_MAX_RESULTS, pageToken, labels = ['INBOX'] } = options;

    return this.withRetry(async () => {
      const listParams: gmail_v1.Params$Resource$Users$Messages$List = {
        userId: 'me',
        maxResults,
        labelIds: labels,
      };

      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      if (query) {
        listParams.q = query;
      }

      const response = await this.gmail!.users.messages.list(listParams);

      const data = response.data;
      const messageIds = data.messages ?? [];

      // Fetch full message details for each message
      const messages = await Promise.all(
        messageIds.map(async (msg: gmail_v1.Schema$Message) => {
          if (!msg.id) return null;
          try {
            return await this.getMessage(msg.id, 'metadata');
          } catch {
            return null;
          }
        })
      );

      const result: MessageListResult = {
        messages: messages.filter((m): m is Email => m !== null),
        totalEstimate: data.resultSizeEstimate ?? 0,
      };

      if (data.nextPageToken) {
        result.nextPageToken = data.nextPageToken;
      }

      return result;
    });
  }

  /**
   * Gets full message details.
   * @param messageId - Gmail message ID
   * @param format - Response format
   * @returns Full email object
   * @throws NotFoundError if message doesn't exist
   * @throws GmailAPIError on API failure
   */
  async getMessage(
    messageId: string,
    format: 'full' | 'metadata' | 'minimal' = 'full'
  ): Promise<Email> {
    this.ensureAuthenticated();

    return this.withRetry(async () => {
      try {
        const response = await this.gmail!.users.messages.get({
          userId: 'me',
          id: messageId,
          format,
        });

        return this.parseMessage(response.data);
      } catch (error) {
        const apiError = error as { code?: number; message?: string };
        if (apiError.code === 404) {
          throw new NotFoundError(`Message not found: ${messageId}`);
        }
        throw error;
      }
    });
  }

  /**
   * Adds or removes labels from messages.
   * @param messageIds - Messages to modify
   * @param options - Labels to add/remove
   * @returns Batch result with success/failure counts
   */
  async modifyLabels(
    messageIds: string[],
    options: { addLabels?: string[]; removeLabels?: string[] }
  ): Promise<BatchResult> {
    this.ensureAuthenticated();

    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Process in batches of 100 (Gmail API limit)
    const batches = this.chunkArray(messageIds, 100);

    for (const batch of batches) {
      try {
        const requestBody: gmail_v1.Schema$BatchModifyMessagesRequest = {
          ids: batch,
        };

        if (options.addLabels) {
          requestBody.addLabelIds = options.addLabels;
        }

        if (options.removeLabels) {
          requestBody.removeLabelIds = options.removeLabels;
        }

        await this.gmail!.users.messages.batchModify({
          userId: 'me',
          requestBody,
        });
        succeeded.push(...batch);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        batch.forEach((id) => failed.push({ id, error: message }));
      }
    }

    return { succeeded, failed };
  }

  /**
   * Archives messages (removes INBOX label).
   * @param messageIds - Messages to archive
   * @returns Batch result
   */
  async archive(messageIds: string[]): Promise<BatchResult> {
    return this.modifyLabels(messageIds, { removeLabels: ['INBOX'] });
  }

  /**
   * Moves messages to trash.
   * @param messageIds - Messages to trash
   * @returns Batch result
   */
  async trash(messageIds: string[]): Promise<BatchResult> {
    this.ensureAuthenticated();

    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of messageIds) {
      try {
        await this.gmail!.users.messages.trash({
          userId: 'me',
          id,
        });
        succeeded.push(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ id, error: message });
      }
    }

    return { succeeded, failed };
  }

  /**
   * Gets all labels for the account.
   * @returns Array of labels
   */
  async listLabels(): Promise<Label[]> {
    this.ensureAuthenticated();

    return this.withRetry(async () => {
      const response = await this.gmail!.users.labels.list({
        userId: 'me',
      });

      return (response.data.labels ?? []).map((label): Label => ({
        id: label.id ?? '',
        name: label.name ?? '',
        type: (label.type === 'system' ? 'system' : 'user') as LabelType,
        ...(label.color?.backgroundColor ? { color: label.color.backgroundColor } : {}),
      }));
    });
  }

  /**
   * Ensures the client is authenticated before making API calls.
   */
  private ensureAuthenticated(): void {
    if (!this.gmail || !this.auth) {
      throw new AuthenticationError('Gmail client not authenticated. Call authenticate() first.');
    }
  }

  /**
   * T025: Wraps API calls with retry logic and exponential backoff.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    return pRetry(
      async () => {
        try {
          return await fn();
        } catch (error) {
          const apiError = error as { code?: number; message?: string };
          const code = apiError.code;
          const message = apiError.message ?? 'Unknown error';

          // Handle specific error codes
          if (code === 401) {
            throw new AbortError(new AuthenticationError(`Unauthorized: ${message}`));
          }

          if (code === 429) {
            throw new RateLimitError(`Rate limit exceeded: ${message}`);
          }

          if (code === 404) {
            throw new AbortError(new NotFoundError(message));
          }

          // Don't retry 4xx errors (except 429 which is handled above)
          if (code !== undefined && code >= 400 && code < 500) {
            throw new AbortError(new GmailAPIError(message, code));
          }

          // Retry on 5xx and other transient errors
          throw new GmailAPIError(message, code);
        }
      },
      {
        retries: MAX_RETRIES,
        minTimeout: BASE_DELAY_MS,
        maxTimeout: BASE_DELAY_MS * 8,
        onFailedAttempt: (_error) => {
          // Log retry attempts for debugging (error object has attemptNumber, retriesLeft)
        },
      }
    );
  }

  /**
   * Parses a Gmail API message into our Email model.
   */
  private parseMessage(message: gmail_v1.Schema$Message): Email {
    const headers = message.payload?.headers ?? [];
    const getHeader = (name: string): string =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

    const fromHeader = getHeader('From');
    const sender = this.parseEmailAddress(fromHeader);

    const toHeader = getHeader('To');
    const ccHeader = getHeader('Cc');
    const recipients = [
      ...this.parseEmailAddresses(toHeader),
      ...this.parseEmailAddresses(ccHeader),
    ];

    const dateHeader = getHeader('Date');
    const date = dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate ?? '0'));

    const labelIds = message.labelIds ?? [];
    const labels: Label[] = labelIds.map((id): Label => ({
      id,
      name: id,
      type: (id.startsWith('Label_') ? 'user' : 'system') as LabelType,
    }));

    const category = this.extractCategory(labelIds);

    // Extract body
    const body = this.extractBody(message.payload);

    const email: Email = {
      id: message.id ?? '',
      threadId: message.threadId ?? '',
      subject: getHeader('Subject'),
      sender,
      recipients,
      date,
      snippet: message.snippet ?? '',
      labels,
      isRead: !labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED'),
      hasAttachments: this.hasAttachments(message.payload),
    };

    if (body.bodyText) {
      email.bodyText = body.bodyText;
    }
    if (body.bodyHtml) {
      email.bodyHtml = body.bodyHtml;
    }
    if (category) {
      email.category = category;
    }

    return email;
  }

  /**
   * Parses an email address string into EmailAddress object.
   */
  private parseEmailAddress(str: string): EmailAddress {
    // Format: "Name <email@example.com>" or just "email@example.com"
    const match = str.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
    if (match) {
      const name = match[1]?.trim();
      const email = match[2]?.trim() ?? str;
      const result: EmailAddress = { email };
      if (name) {
        result.name = name;
      }
      return result;
    }
    return { email: str };
  }

  /**
   * Parses comma-separated email addresses.
   */
  private parseEmailAddresses(str: string): EmailAddress[] {
    if (!str) return [];
    // Split on commas that are not inside quotes
    const parts = str.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    return parts.map((p) => this.parseEmailAddress(p.trim())).filter((e) => e.email);
  }

  /**
   * Extracts category from label IDs.
   */
  private extractCategory(labelIds: string[]): Category | undefined {
    const categoryMap: Record<string, Category> = {
      CATEGORY_PRIMARY: 'primary',
      CATEGORY_SOCIAL: 'social',
      CATEGORY_PROMOTIONS: 'promotions',
      CATEGORY_UPDATES: 'updates',
      CATEGORY_FORUMS: 'forums',
    };

    for (const id of labelIds) {
      const category = categoryMap[id];
      if (category) {
        return category;
      }
    }
    return undefined;
  }

  /**
   * Extracts body text and HTML from message payload.
   */
  private extractBody(payload?: gmail_v1.Schema$MessagePart): {
    bodyText?: string;
    bodyHtml?: string;
  } {
    if (!payload) return {};

    let bodyText: string | undefined;
    let bodyHtml: string | undefined;

    const processPayload = (part: gmail_v1.Schema$MessagePart) => {
      if (part.body?.data) {
        const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
        if (part.mimeType === 'text/plain' && !bodyText) {
          bodyText = decoded;
        } else if (part.mimeType === 'text/html' && !bodyHtml) {
          bodyHtml = decoded;
        }
      }

      if (part.parts) {
        part.parts.forEach(processPayload);
      }
    };

    processPayload(payload);

    const result: { bodyText?: string; bodyHtml?: string } = {};
    if (bodyText) {
      result.bodyText = bodyText;
    }
    if (bodyHtml) {
      result.bodyHtml = bodyHtml;
    }
    return result;
  }

  /**
   * Checks if message has attachments.
   */
  private hasAttachments(payload?: gmail_v1.Schema$MessagePart): boolean {
    if (!payload) return false;

    const checkPart = (part: gmail_v1.Schema$MessagePart): boolean => {
      if (part.filename && part.filename.length > 0) {
        return true;
      }
      if (part.parts) {
        return part.parts.some(checkPart);
      }
      return false;
    };

    return checkPart(payload);
  }

  /**
   * Splits array into chunks of specified size.
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
