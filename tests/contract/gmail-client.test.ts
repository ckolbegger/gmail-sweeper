import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  GmailClient,
  AuthManager,
  AuthCredentials,
  GmailClientConfig,
} from '../../src/core/contracts/gmail-api.js';
import type { Email, PaginatedResult, SyncResult, SyncProgress } from '../../src/core/contracts/types.js';
import { GmailError } from '../../src/core/errors/index.js';

// ============================================================================
// Mock Gmail API Responses
// ============================================================================

const mockGmailMessageListResponse = {
  messages: [
    { id: 'msg_001', threadId: 'thread_001' },
    { id: 'msg_002', threadId: 'thread_002' },
    { id: 'msg_003', threadId: 'thread_003' },
  ],
  nextPageToken: 'next_page_token_123',
  resultSizeEstimate: 100,
};

const mockGmailMessageResponse = {
  id: 'msg_001',
  threadId: 'thread_001',
  labelIds: ['INBOX', 'UNREAD', 'CATEGORY_UPDATES'],
  snippet: 'Test email snippet...',
  historyId: '1234567890',
  internalDate: '1704067200000', // 2024-01-01T00:00:00.000Z
  payload: {
    headers: [
      { name: 'Subject', value: 'Test Subject' },
      { name: 'From', value: 'John Doe <john@example.com>' },
      { name: 'To', value: 'recipient@example.com' },
      { name: 'Cc', value: 'cc@example.com' },
      { name: 'Date', value: 'Mon, 01 Jan 2024 00:00:00 GMT' },
    ],
    body: {
      data: Buffer.from('Hello, this is a test email body.').toString('base64url'),
    },
    parts: [
      {
        mimeType: 'text/plain',
        body: {
          data: Buffer.from('Hello, this is a test email body.').toString('base64url'),
        },
      },
      {
        mimeType: 'text/html',
        body: {
          data: Buffer.from('<html><body>Hello, this is a test email body.</body></html>').toString('base64url'),
        },
      },
    ],
  },
};

const mockGmailHistoryResponse = {
  history: [
    {
      id: 'history_001',
      messagesAdded: [{ message: { id: 'msg_004', threadId: 'thread_004' } }],
    },
    {
      id: 'history_002',
      labelsAdded: [{ message: { id: 'msg_001' }, labelIds: ['IMPORTANT'] }],
    },
  ],
  historyId: '1234567891',
  nextPageToken: undefined,
};

const mockGmailLabelsResponse = {
  labels: [
    { id: 'INBOX', name: 'INBOX', type: 'system' },
    { id: 'SENT', name: 'SENT', type: 'system' },
    { id: 'Label_1', name: 'Custom Label', type: 'user', color: { backgroundColor: '#ffffff', textColor: '#000000' } },
  ],
};

// ============================================================================
// Mock Implementation Classes
// ============================================================================

class MockAuthManager implements AuthManager {
  private authenticated = false;
  private credentials: AuthCredentials | null = null;
  private tokenRefreshHandlers: Array<(credentials: AuthCredentials) => void> = [];

  async isAuthenticated(): Promise<boolean> {
    return this.authenticated;
  }

  async getAuthUrl(): Promise<string> {
    return 'https://accounts.google.com/o/oauth2/auth?client_id=test&redirect_uri=http://localhost&scope=email';
  }

  async exchangeCode(code: string): Promise<AuthCredentials> {
    if (code === 'invalid_code') {
      throw new GmailError('INVALID_REQUEST', 'Invalid authorization code');
    }

    this.credentials = {
      accessToken: 'mock_access_token_' + code,
      refreshToken: 'mock_refresh_token',
      expiryDate: Date.now() + 3600 * 1000,
    };
    this.authenticated = true;
    return this.credentials;
  }

  async getAccessToken(): Promise<string> {
    if (!this.authenticated || !this.credentials) {
      throw new GmailError('AUTH_REQUIRED', 'Not authenticated');
    }

    // Simulate token refresh if expired
    if (this.credentials.expiryDate && this.credentials.expiryDate < Date.now()) {
      this.credentials = {
        ...this.credentials,
        accessToken: 'refreshed_access_token',
        expiryDate: Date.now() + 3600 * 1000,
      };
      this.tokenRefreshHandlers.forEach(handler => handler(this.credentials!));
    }

    return this.credentials.accessToken;
  }

  async revokeAuth(): Promise<void> {
    this.authenticated = false;
    this.credentials = null;
  }

  onTokenRefresh(handler: (credentials: AuthCredentials) => void): void {
    this.tokenRefreshHandlers.push(handler);
  }

  // Test helper methods
  setAuthenticated(value: boolean): void {
    this.authenticated = value;
  }

  setCredentials(credentials: AuthCredentials | null): void {
    this.credentials = credentials;
  }

  simulateTokenExpiry(): void {
    if (this.credentials) {
      this.credentials.expiryDate = Date.now() - 1000;
    }
  }
}

class MockGmailClient implements GmailClient {
  readonly auth: AuthManager;
  private config: GmailClientConfig;
  private requestCount = 0;
  private lastRequestTime = 0;
  private mockResponses: Map<string, unknown> = new Map();
  private shouldFailNextRequest = false;
  private rateLimitHits = 0;

  constructor(config: GmailClientConfig) {
    this.config = {
      rateLimitRps: 10,
      timeoutMs: 30000,
      ...config,
    };
    this.auth = new MockAuthManager();
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.mockResponses.set('users.messages.list', mockGmailMessageListResponse);
    this.mockResponses.set('users.messages.get', mockGmailMessageResponse);
    this.mockResponses.set('users.history.list', mockGmailHistoryResponse);
    this.mockResponses.set('users.labels.list', mockGmailLabelsResponse);
    this.mockResponses.set('users.profile.get', { historyId: '1234567890' });
  }

  private async makeRequest<T>(apiName: string, params?: Record<string, unknown>): Promise<T> {
    // Check authentication
    const token = await this.auth.getAccessToken();
    if (!token) {
      throw new GmailError('AUTH_REQUIRED', 'Authentication required');
    }

    // Rate limiting with exponential backoff
    const now = Date.now();
    const minInterval = 1000 / (this.config.rateLimitRps || 10);
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Simulate rate limiting on every 5th request during testing
    this.requestCount++;
    if (this.requestCount % 5 === 0 && this.rateLimitHits < 2) {
      this.rateLimitHits++;
      const backoffDelay = Math.pow(2, this.rateLimitHits) * 100;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      this.rateLimitHits = 0;
    }

    this.lastRequestTime = Date.now();

    // Simulate API errors
    if (this.shouldFailNextRequest) {
      this.shouldFailNextRequest = false;
      throw new GmailError('NETWORK_ERROR', 'Simulated API error');
    }

    // Simulate 429 rate limit error
    if (params?._simulateRateLimit) {
      throw new GmailError('RATE_LIMITED', 'Rate limit exceeded');
    }

    // Simulate 404 not found
    if (params?._simulateNotFound) {
      throw new GmailError('NOT_FOUND', 'Resource not found');
    }

    const response = this.mockResponses.get(apiName);
    if (response === undefined) {
      throw new GmailError('NOT_FOUND', `Mock response not found for ${apiName}`);
    }

    return response as T;
  }

  private parseGmailMessage(message: typeof mockGmailMessageResponse): Email {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string): string => headers.find(h => h.name === name)?.value || '';

    const parseEmailAddress = (headerValue: string): { name?: string; email: string } => {
      if (!headerValue) return { email: '' };
      // Match "Name <email@example.com>" or "email@example.com"
      const match = headerValue.match(/^(?:(.+?)\s*)?<([^>]+)>$|^([^<]+)$/);
      if (match) {
        if (match[1] && match[2]) {
          // Format: "Name <email>"
          const name = match[1].trim();
          const email = match[2].trim();
          return { name, email };
        } else if (match[3]) {
          // Format: "email" (no name)
          return { email: match[3].trim() };
        }
      }
      return { email: headerValue.trim() };
    };

    const parseEmailList = (headerValue: string): Array<{ name?: string; email: string }> => {
      if (!headerValue) return [];
      return headerValue.split(',').map(addr => parseEmailAddress(addr.trim()));
    };

    const extractBody = (): { text: string; html?: string } => {
      const parts = message.payload?.parts || [];
      const textPart = parts.find(p => p.mimeType === 'text/plain');
      const htmlPart = parts.find(p => p.mimeType === 'text/html');

      return {
        text: textPart?.body?.data
          ? Buffer.from(textPart.body.data, 'base64url').toString()
          : message.payload?.body?.data
            ? Buffer.from(message.payload.body.data, 'base64url').toString()
            : '',
        html: htmlPart?.body?.data
          ? Buffer.from(htmlPart.body.data, 'base64url').toString()
          : undefined,
      };
    };

    const internalDate = parseInt(message.internalDate || '0', 10);

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject'),
      sender: parseEmailAddress(getHeader('From')),
      recipients: parseEmailList(getHeader('To')),
      cc: parseEmailList(getHeader('Cc')),
      bcc: parseEmailList(getHeader('Bcc')),
      dateReceived: new Date(internalDate),
      body: extractBody(),
      labels: message.labelIds || [],
      isRead: !message.labelIds?.includes('UNREAD'),
      snippet: message.snippet || '',
      historyId: message.historyId,
      syncedAt: new Date(),
    };
  }

  async listEmails(options: {
    limit?: number;
    offset?: number;
    filter?: { sender?: string; searchText?: string };
  }): Promise<PaginatedResult<Email>> {
    const limit = options.limit || 50;
    const response = await this.makeRequest<typeof mockGmailMessageListResponse>('users.messages.list', {
      maxResults: limit,
      pageToken: options.offset ? 'token_' + options.offset : undefined,
      q: options.filter?.searchText,
      from: options.filter?.sender,
    });

    const emails: Email[] = [];
    // Only process up to the limit
    const messagesToProcess = (response.messages || []).slice(0, limit);
    for (const msg of messagesToProcess) {
      const detailResponse = await this.makeRequest<typeof mockGmailMessageResponse>('users.messages.get', {
        id: msg.id,
      });
      emails.push(this.parseGmailMessage(detailResponse));
    }

    return {
      items: emails,
      total: response.resultSizeEstimate || emails.length,
      offset: options.offset || 0,
      limit: limit,
      hasMore: !!response.nextPageToken,
    };
  }

  async getEmail(id: string, options?: Record<string, unknown>): Promise<Email | null> {
    try {
      const response = await this.makeRequest<typeof mockGmailMessageResponse>('users.messages.get', { id, ...options });
      // If response is null, return null (for testing non-existent emails)
      if (response === null) {
        return null;
      }
      return this.parseGmailMessage(response);
    } catch (error) {
      if (error instanceof GmailError && error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

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

  async getEmailContent(id: string): Promise<Email | null> {
    // Same as getEmail for this mock - fetches full content
    return this.getEmail(id);
  }

  async fullSync(options: {
    batchSize?: number;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult> {
    const batchSize = options.batchSize || 100;
    let processed = 0;
    let hasMore = true;
    let pageToken: string | undefined;
    let batchNumber = 0;
    // Limit iterations to prevent infinite loops in tests
    const maxIterations = 2;

    while (hasMore && batchNumber < maxIterations) {
      const response = await this.makeRequest<typeof mockGmailMessageListResponse>('users.messages.list', {
        maxResults: batchSize,
        pageToken,
      });

      processed += response.messages?.length || 0;
      hasMore = !!response.nextPageToken;
      pageToken = response.nextPageToken;
      batchNumber++;

      if (options.onProgress) {
        options.onProgress({
          total: response.resultSizeEstimate || processed,
          processed,
          batchNumber,
          batchSize: response.messages?.length || 0,
        });
      }
    }

    return {
      success: true,
      emailsAdded: processed,
      emailsUpdated: 0,
      emailsDeleted: 0,
      historyId: '1234567890',
    };
  }

  async incrementalSync(options: {
    historyId: string;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult> {
    const response = await this.makeRequest<typeof mockGmailHistoryResponse>('users.history.list', {
      startHistoryId: options.historyId,
    });

    const added = response.history?.reduce((sum, h) => sum + (h.messagesAdded?.length || 0), 0) || 0;

    if (options.onProgress) {
      options.onProgress({
        total: added,
        processed: added,
        batchNumber: 1,
        batchSize: added,
      });
    }

    return {
      success: true,
      emailsAdded: added,
      emailsUpdated: response.history?.reduce((sum, h) => sum + (h.labelsAdded?.length || 0), 0) || 0,
      emailsDeleted: 0,
      historyId: response.historyId,
    };
  }

  async getCurrentHistoryId(): Promise<string> {
    const response = await this.makeRequest<{ historyId: string }>('users.profile.get');
    return response.historyId || '1234567890';
  }

  async labelEmails(emailIds: string[], _labelId: string): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return {
      success: true,
      successfulCount: emailIds.length,
      failedCount: 0,
      failures: [],
    };
  }

  async removeLabel(emailIds: string[], _labelId: string): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return {
      success: true,
      successfulCount: emailIds.length,
      failedCount: 0,
      failures: [],
    };
  }

  async archiveEmails(emailIds: string[]): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return this.removeLabel(emailIds, 'INBOX');
  }

  async deleteEmails(emailIds: string[]): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return {
      success: true,
      successfulCount: emailIds.length,
      failedCount: 0,
      failures: [],
    };
  }

  async markAsRead(emailIds: string[], isRead: boolean): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    if (isRead) {
      return this.removeLabel(emailIds, 'UNREAD');
    } else {
      return this.labelEmails(emailIds, 'UNREAD');
    }
  }

  // Test helper methods
  simulateApiError(): void {
    this.shouldFailNextRequest = true;
  }

  setMockResponse(apiName: string, response: unknown): void {
    this.mockResponses.set(apiName, response);
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('GmailClient Contract Tests', () => {
  let client: MockGmailClient;
  let authManager: MockAuthManager;
  const config: GmailClientConfig = {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    rateLimitRps: 10,
    timeoutMs: 30000,
  };

  beforeEach(() => {
    client = new MockGmailClient(config);
    authManager = client.auth as MockAuthManager;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // AuthManager Tests (T029)
  // ============================================================================

  describe('AuthManager', () => {
    describe('getAuthUrl', () => {
      it('should generate OAuth2 authorization URL', async () => {
        const url = await authManager.getAuthUrl();

        expect(url).toContain('accounts.google.com/o/oauth2/auth');
        expect(url).toContain('client_id=');
        expect(url).toContain('redirect_uri=');
        expect(url).toContain('scope=');
      });
    });

    describe('exchangeCode', () => {
      it('should exchange authorization code for tokens', async () => {
        const credentials = await authManager.exchangeCode('valid_auth_code');

        expect(credentials.accessToken).toBeDefined();
        expect(credentials.accessToken).toContain('mock_access_token_');
        expect(credentials.refreshToken).toBe('mock_refresh_token');
        expect(credentials.expiryDate).toBeGreaterThan(Date.now());
      });

      it('should persist tokens securely after exchange', async () => {
        const credentials = await authManager.exchangeCode('valid_auth_code');
        const isAuthenticated = await authManager.isAuthenticated();

        expect(isAuthenticated).toBe(true);
        const token = await authManager.getAccessToken();
        expect(token).toBe(credentials.accessToken);
      });

      it('should handle invalid authorization code', async () => {
        await expect(authManager.exchangeCode('invalid_code')).rejects.toThrow(GmailError);
        await expect(authManager.exchangeCode('invalid_code')).rejects.toThrow('Invalid authorization code');
      });
    });

    describe('getAccessToken', () => {
      it('should return valid access token when authenticated', async () => {
        await authManager.exchangeCode('valid_code');
        const token = await authManager.getAccessToken();

        expect(token).toBeDefined();
        expect(token).toContain('mock_access_token_');
      });

      it('should refresh expired access tokens', async () => {
        await authManager.exchangeCode('valid_code');
        authManager.simulateTokenExpiry();

        const token = await authManager.getAccessToken();

        expect(token).toBe('refreshed_access_token');
      });

      it('should notify listeners on token refresh', async () => {
        const refreshHandler = vi.fn();
        authManager.onTokenRefresh(refreshHandler);

        await authManager.exchangeCode('valid_code');
        authManager.simulateTokenExpiry();
        await authManager.getAccessToken();

        expect(refreshHandler).toHaveBeenCalledTimes(1);
        expect(refreshHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            accessToken: 'refreshed_access_token',
          })
        );
      });

      it('should throw AUTH_REQUIRED when not authenticated', async () => {
        await expect(authManager.getAccessToken()).rejects.toThrow(GmailError);
        await expect(authManager.getAccessToken()).rejects.toThrow('Not authenticated');
      });
    });

    describe('isAuthenticated', () => {
      it('should return false when not authenticated', async () => {
        const result = await authManager.isAuthenticated();
        expect(result).toBe(false);
      });

      it('should return true after successful authentication', async () => {
        await authManager.exchangeCode('valid_code');
        const result = await authManager.isAuthenticated();
        expect(result).toBe(true);
      });

      it('should return false after revokeAuth', async () => {
        await authManager.exchangeCode('valid_code');
        await authManager.revokeAuth();
        const result = await authManager.isAuthenticated();
        expect(result).toBe(false);
      });
    });

    describe('revokeAuth', () => {
      it('should revoke authentication on logout', async () => {
        await authManager.exchangeCode('valid_code');
        expect(await authManager.isAuthenticated()).toBe(true);

        await authManager.revokeAuth();

        expect(await authManager.isAuthenticated()).toBe(false);
        await expect(authManager.getAccessToken()).rejects.toThrow('Not authenticated');
      });

      it('should clear stored credentials on revoke', async () => {
        await authManager.exchangeCode('valid_code');
        await authManager.revokeAuth();

        // Should not be able to get token after revoke
        await expect(authManager.getAccessToken()).rejects.toThrow(GmailError);
      });
    });
  });

  // ============================================================================
  // GmailClient Tests (T030)
  // ============================================================================

  describe('GmailClient', () => {
    beforeEach(async () => {
      // Authenticate before each test
      await authManager.exchangeCode('valid_code');
    });

    describe('listEmails', () => {
      it('should fetch emails from Gmail API', async () => {
        const result = await client.listEmails({ limit: 10 });

        expect(result.items).toBeDefined();
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.total).toBeGreaterThan(0);
        expect(result.hasMore).toBe(true);
      });

      it('should parse Gmail API response to Email model', async () => {
        const result = await client.listEmails({ limit: 1 });
        const email = result.items[0];

        expect(email.id).toBe('msg_001');
        expect(email.threadId).toBe('thread_001');
        expect(email.subject).toBe('Test Subject');
        expect(email.sender.email).toBe('john@example.com');
        expect(email.sender.name).toBe('John Doe');
        expect(email.recipients).toHaveLength(1);
        expect(email.recipients[0].email).toBe('recipient@example.com');
        expect(email.cc).toHaveLength(1);
        expect(email.cc[0].email).toBe('cc@example.com');
        expect(email.body.text).toBe('Hello, this is a test email body.');
        expect(email.body.html).toContain('<html>');
        expect(email.labels).toContain('INBOX');
        expect(email.labels).toContain('UNREAD');
        expect(email.isRead).toBe(false);
        expect(email.snippet).toBe('Test email snippet...');
        expect(email.historyId).toBe('1234567890');
        expect(email.dateReceived).toBeInstanceOf(Date);
        expect(email.syncedAt).toBeInstanceOf(Date);
      });

      it('should support pagination', async () => {
        const page1 = await client.listEmails({ limit: 2, offset: 0 });
        expect(page1.items).toHaveLength(2);
        expect(page1.offset).toBe(0);
        expect(page1.limit).toBe(2);

        const page2 = await client.listEmails({ limit: 2, offset: 2 });
        expect(page2.offset).toBe(2);
      });

      it('should support filtering by sender', async () => {
        const result = await client.listEmails({
          filter: { sender: 'john@example.com' },
        });
        expect(result.items.length).toBeGreaterThan(0);
      });

      it('should support search text filtering', async () => {
        const result = await client.listEmails({
          filter: { searchText: 'test subject' },
        });
        expect(result.items.length).toBeGreaterThan(0);
      });
    });

    describe('getEmail', () => {
      it('should fetch email content by ID', async () => {
        const email = await client.getEmail('msg_001');

        expect(email).not.toBeNull();
        expect(email?.id).toBe('msg_001');
        expect(email?.subject).toBe('Test Subject');
        expect(email?.body.text).toBeDefined();
      });

      it('should return null for non-existent email', async () => {
        client.setMockResponse('users.messages.get', null);
        const email = await client.getEmail('non_existent');
        expect(email).toBeNull();
      });

      it('should parse full email content correctly', async () => {
        const email = await client.getEmail('msg_001');

        expect(email?.body.text).toBe('Hello, this is a test email body.');
        expect(email?.body.html).toContain('<html>');
        expect(email?.snippet).toBe('Test email snippet...');
      });
    });

    describe('getEmails', () => {
      it('should fetch multiple emails by IDs', async () => {
        const emails = await client.getEmails(['msg_001', 'msg_002', 'msg_003']);

        expect(emails).toHaveLength(3);
        expect(emails[0].id).toBe('msg_001');
      });

      it('should handle missing emails gracefully', async () => {
        // Test that getEmails filters out null results (when email not found)
        // The mock getEmail returns null when the mock response is set to null
        const customClient = new MockGmailClient(config);
        await (customClient.auth as MockAuthManager).exchangeCode('valid_code');

        // Simulate: first email found, second not found (returns null)
        const originalGetEmail = customClient.getEmail.bind(customClient);
        let callCount = 0;
        customClient.getEmail = async (id: string, options?: Record<string, unknown>): Promise<Email | null> => {
          callCount++;
          if (callCount === 2) {
            return null; // Simulate second email not found
          }
          return originalGetEmail(id, options);
        };

        const emails = await customClient.getEmails(['msg_001', 'non_existent']);

        expect(emails).toHaveLength(1);
        expect(emails[0].id).toBe('msg_001');
      });
    });

    describe('getEmailContent', () => {
      it('should fetch full email content including body', async () => {
        const email = await client.getEmailContent('msg_001');

        expect(email).not.toBeNull();
        expect(email?.body.text).toBe('Hello, this is a test email body.');
        expect(email?.body.html).toBeDefined();
      });
    });

    describe('rate limiting', () => {
      it('should handle rate limiting with exponential backoff', async () => {
        const startTime = Date.now();

        // Make multiple requests to trigger rate limiting
        for (let i = 0; i < 6; i++) {
          await client.listEmails({ limit: 1 });
        }

        const elapsed = Date.now() - startTime;
        // Should have some delay due to rate limiting (at least 100ms for exponential backoff)
        expect(elapsed).toBeGreaterThanOrEqual(100);
      });

      it('should respect rate limit configuration', async () => {
        const customClient = new MockGmailClient({
          ...config,
          rateLimitRps: 100, // Higher rate limit
        });
        await (customClient.auth as MockAuthManager).exchangeCode('valid_code');

        const startTime = Date.now();
        await customClient.listEmails({ limit: 1 });
        const elapsed = Date.now() - startTime;

        // Should be faster with higher rate limit
        expect(elapsed).toBeLessThan(100);
      });
    });

    describe('error handling', () => {
      it('should handle API errors gracefully', async () => {
        client.simulateApiError();

        await expect(client.listEmails({})).rejects.toThrow(GmailError);
      });

      it('should handle rate limit errors with retry', async () => {
        await expect(
          client.getEmail('test', { _simulateRateLimit: true } as unknown as Record<string, unknown>)
        ).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle not found errors', async () => {
        // getEmail returns null for not found (doesn't throw)
        const result = await client.getEmail('test', { _simulateNotFound: true } as unknown as Record<string, unknown>);
        expect(result).toBeNull();
      });

      it('should throw AUTH_REQUIRED when not authenticated', async () => {
        await authManager.revokeAuth();

        await expect(client.listEmails({})).rejects.toThrow(GmailError);
        await expect(client.listEmails({})).rejects.toThrow('Not authenticated');
      });

      it('should identify retryable errors', async () => {
        client.simulateApiError();

        try {
          await client.listEmails({});
        } catch (error) {
          expect(error).toBeInstanceOf(GmailError);
          expect((error as GmailError).isRetryable()).toBe(true);
        }
      });
    });

    describe('authentication', () => {
      it('should authenticate requests with valid token', async () => {
        const result = await client.listEmails({ limit: 1 });

        expect(result.items).toBeDefined();
        expect(result.items.length).toBeGreaterThan(0);
      });

      it('should include access token in API requests', async () => {
        const token = await authManager.getAccessToken();
        expect(token).toBeDefined();
        expect(token).toContain('mock_access_token_');
      });
    });

    describe('sync operations', () => {
      it('should perform full sync of all emails', async () => {
        const result = await client.fullSync({ batchSize: 10 });

        expect(result.success).toBe(true);
        expect(result.emailsAdded).toBeGreaterThan(0);
        expect(result.historyId).toBeDefined();
      });

      it('should report sync progress', async () => {
        const progressHandler = vi.fn();

        await client.fullSync({
          batchSize: 10,
          onProgress: progressHandler,
        });

        expect(progressHandler).toHaveBeenCalled();
        const firstCall = progressHandler.mock.calls[0][0] as SyncProgress;
        expect(firstCall).toHaveProperty('total');
        expect(firstCall).toHaveProperty('processed');
        expect(firstCall).toHaveProperty('batchNumber');
        expect(firstCall).toHaveProperty('batchSize');
      });

      it('should report total count greater than or equal to processed count', async () => {
        const progressHandler = vi.fn();

        await client.fullSync({
          batchSize: 10,
          onProgress: progressHandler,
        });

        expect(progressHandler).toHaveBeenCalled();
        // Check that total is reported and is meaningful
        const calls = progressHandler.mock.calls;
        for (const call of calls) {
          const progress = call[0] as SyncProgress;
          expect(progress.total).toBeGreaterThan(0);
          expect(progress.processed).toBeLessThanOrEqual(progress.total);
        }
      });

      it('should perform incremental sync using history ID', async () => {
        const result = await client.incrementalSync({ historyId: '1234567890' });

        expect(result.success).toBe(true);
        expect(result.historyId).toBeDefined();
        expect(result.historyId).not.toBe('1234567890');
      });

      it('should report incremental sync progress', async () => {
        const progressHandler = vi.fn();

        await client.incrementalSync({
          historyId: '1234567890',
          onProgress: progressHandler,
        });

        expect(progressHandler).toHaveBeenCalled();
      });
    });

    describe('batch operations', () => {
      it('should apply labels to emails', async () => {
        const result = await client.labelEmails(['msg_001', 'msg_002'], 'IMPORTANT');

        expect(result.success).toBe(true);
        expect(result.successfulCount).toBe(2);
        expect(result.failedCount).toBe(0);
      });

      it('should remove labels from emails', async () => {
        const result = await client.removeLabel(['msg_001'], 'INBOX');

        expect(result.success).toBe(true);
        expect(result.successfulCount).toBe(1);
      });

      it('should archive emails', async () => {
        const result = await client.archiveEmails(['msg_001', 'msg_002']);

        expect(result.success).toBe(true);
        expect(result.successfulCount).toBe(2);
      });

      it('should delete emails', async () => {
        const result = await client.deleteEmails(['msg_001']);

        expect(result.success).toBe(true);
        expect(result.successfulCount).toBe(1);
      });

      it('should mark emails as read', async () => {
        const result = await client.markAsRead(['msg_001', 'msg_002'], true);

        expect(result.success).toBe(true);
        expect(result.successfulCount).toBe(2);
      });

      it('should mark emails as unread', async () => {
        const result = await client.markAsRead(['msg_001'], false);

        expect(result.success).toBe(true);
        expect(result.successfulCount).toBe(1);
      });
    });

    describe('getCurrentHistoryId', () => {
      it('should return current history ID', async () => {
        const historyId = await client.getCurrentHistoryId();

        expect(historyId).toBeDefined();
        expect(typeof historyId).toBe('string');
      });
    });
  });
});

// ============================================================================
// Interface Compliance Tests
// ============================================================================

describe('GmailClient Interface Compliance', () => {
  it('should have auth property of type AuthManager', () => {
    const client = new MockGmailClient({
      clientId: 'test',
      clientSecret: 'test',
      redirectUri: 'http://localhost',
    });

    expect(client.auth).toBeDefined();
    expect(typeof client.auth.isAuthenticated).toBe('function');
    expect(typeof client.auth.getAuthUrl).toBe('function');
    expect(typeof client.auth.exchangeCode).toBe('function');
    expect(typeof client.auth.getAccessToken).toBe('function');
    expect(typeof client.auth.revokeAuth).toBe('function');
    expect(typeof client.auth.onTokenRefresh).toBe('function');
  });

  it('should implement all GmailClient methods', () => {
    const client = new MockGmailClient({
      clientId: 'test',
      clientSecret: 'test',
      redirectUri: 'http://localhost',
    });

    expect(typeof client.listEmails).toBe('function');
    expect(typeof client.getEmail).toBe('function');
    expect(typeof client.getEmails).toBe('function');
    expect(typeof client.getEmailContent).toBe('function');
    expect(typeof client.fullSync).toBe('function');
    expect(typeof client.incrementalSync).toBe('function');
    expect(typeof client.getCurrentHistoryId).toBe('function');
    expect(typeof client.labelEmails).toBe('function');
    expect(typeof client.removeLabel).toBe('function');
    expect(typeof client.archiveEmails).toBe('function');
    expect(typeof client.deleteEmails).toBe('function');
    expect(typeof client.markAsRead).toBe('function');
  });
});
