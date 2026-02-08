/**
 * GmailClient Unit Tests
 *
 * Tests for Gmail API client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GmailClient } from '../../../src/core/contracts/gmail-api.js';

// Mock the googleapis
const mockGmailUsersMessagesList = vi.fn();
const mockGmailUsersMessagesGet = vi.fn();
const mockGmailUsersMessagesBatchGet = vi.fn();
const mockGmailUsersHistoryList = vi.fn();
const mockGmailUsersGetProfile = vi.fn();
const mockGmailUsersMessagesModify = vi.fn();
const mockGmailUsersMessagesTrash = vi.fn();

const mockOAuth2 = vi.fn(() => ({
  setCredentials: vi.fn(),
}));

const mockGmail = vi.fn(() => ({
  users: {
    messages: {
      list: mockGmailUsersMessagesList,
      get: mockGmailUsersMessagesGet,
      batchGet: mockGmailUsersMessagesBatchGet,
      modify: mockGmailUsersMessagesModify,
      trash: mockGmailUsersMessagesTrash,
    },
    history: {
      list: mockGmailUsersHistoryList,
    },
    getProfile: mockGmailUsersGetProfile,
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: mockOAuth2,
    },
    gmail: vi.fn(() => mockGmail()),
  },
}));

// Mock AuthManager
const mockIsAuthenticated = vi.fn();
const mockGetAccessToken = vi.fn();

const createMockAuthManager = () => ({
  isAuthenticated: mockIsAuthenticated,
  getAccessToken: mockGetAccessToken,
  getAuthUrl: vi.fn(),
  exchangeCode: vi.fn(),
  revokeAuth: vi.fn(),
  onTokenRefresh: vi.fn(),
});

// Mock logger
vi.mock('../../../src/core/logging/index.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GmailClient', () => {
  let gmailClient: GmailClient;
  let mockAuthManager: ReturnType<typeof createMockAuthManager>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    mockAuthManager = createMockAuthManager();
    mockIsAuthenticated.mockResolvedValue(true);
    mockGetAccessToken.mockResolvedValue('test-access-token');

    // Reset gmail mocks
    mockGmailUsersMessagesList.mockResolvedValue({ data: { messages: [], nextPageToken: null } });
    mockGmailUsersMessagesGet.mockResolvedValue({ data: {} });
    mockGmailUsersGetProfile.mockResolvedValue({ data: { historyId: '12345' } });

    const { createGmailClient } = await import('../../../src/core/services/gmail-client.js');
    gmailClient = createGmailClient(mockAuthManager as unknown as Parameters<typeof createGmailClient>[0]);
  });

  describe('auth', () => {
    it('should expose auth manager', () => {
      expect(gmailClient.auth).toBeDefined();
      expect(gmailClient.auth).toBe(mockAuthManager);
    });
  });

  describe('listEmails', () => {
    it('should throw if not authenticated', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      const { GmailError } = await import('../../../src/core/errors/index.js');

      await expect(gmailClient.listEmails({})).rejects.toThrow(GmailError);
    });

    it('should list emails with pagination', async () => {
      const mockMessages = [
        { id: 'msg1', threadId: 'thread1' },
        { id: 'msg2', threadId: 'thread2' },
      ];
      mockGmailUsersMessagesList.mockResolvedValue({
        data: {
          messages: mockMessages,
          nextPageToken: null,
          resultSizeEstimate: 2,
        },
      });
      
      // Mock getEmail responses for each message
      mockGmailUsersMessagesGet
        .mockResolvedValueOnce({
          data: {
            id: 'msg1',
            threadId: 'thread1',
            labelIds: ['INBOX'],
            snippet: 'Test 1',
            payload: {
              headers: [
                { name: 'Subject', value: 'Subject 1' },
                { name: 'From', value: 'sender1@example.com' },
                { name: 'Date', value: 'Mon, 01 Jan 2024 12:00:00 GMT' },
              ],
            },
            internalDate: '1704110400000',
            historyId: '12345',
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'msg2',
            threadId: 'thread2',
            labelIds: ['INBOX'],
            snippet: 'Test 2',
            payload: {
              headers: [
                { name: 'Subject', value: 'Subject 2' },
                { name: 'From', value: 'sender2@example.com' },
                { name: 'Date', value: 'Mon, 01 Jan 2024 13:00:00 GMT' },
              ],
            },
            internalDate: '1704114000000',
            historyId: '12346',
          },
        });

      const result = await gmailClient.listEmails({ maxResults: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination token', async () => {
      mockGmailUsersMessagesList.mockResolvedValue({
        data: {
          messages: [{ id: 'msg1', threadId: 'thread1' }],
          nextPageToken: 'next-page-token',
          resultSizeEstimate: 100,
        },
      });

      const result = await gmailClient.listEmails({ maxResults: 1, pageToken: 'prev-token' });

      expect(mockGmailUsersMessagesList).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'me',
          maxResults: 1,
          pageToken: 'prev-token',
        })
      );
      expect(result.hasMore).toBe(true);
    });

    it('should apply query filter', async () => {
      mockGmailUsersMessagesList.mockResolvedValue({
        data: { messages: [], resultSizeEstimate: 0 },
      });

      await gmailClient.listEmails({ q: 'from:test@example.com' });

      expect(mockGmailUsersMessagesList).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'from:test@example.com',
        })
      );
    });

    it('should handle rate limiting with retry', async () => {
      mockGmailUsersMessagesList
        .mockRejectedValueOnce({ code: 429, message: 'Rate limit exceeded' })
        .mockResolvedValueOnce({
          data: { messages: [{ id: 'msg1', threadId: 'thread1' }], resultSizeEstimate: 1 },
        });
      
      // Also mock getEmail for the single message returned
      mockGmailUsersMessagesGet.mockResolvedValue({
        data: {
          id: 'msg1',
          threadId: 'thread1',
          labelIds: ['INBOX'],
          snippet: 'Test',
          payload: {
            headers: [
              { name: 'Subject', value: 'Test' },
              { name: 'From', value: 'sender@example.com' },
              { name: 'Date', value: 'Mon, 01 Jan 2024 12:00:00 GMT' },
            ],
          },
          internalDate: '1704110400000',
          historyId: '12345',
        },
      });

      const result = await gmailClient.listEmails({});

      expect(mockGmailUsersMessagesList).toHaveBeenCalledTimes(2);
      expect(result.items).toHaveLength(1);
    });

    it('should handle empty inbox', async () => {
      mockGmailUsersMessagesList.mockResolvedValue({
        data: { messages: undefined, resultSizeEstimate: 0 },
      });

      const result = await gmailClient.listEmails({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getEmail', () => {
    it('should fetch single email by id', async () => {
      mockGmailUsersMessagesGet.mockResolvedValue({
        data: {
          id: 'msg1',
          threadId: 'thread1',
          labelIds: ['INBOX', 'UNREAD'],
          snippet: 'Test snippet',
          payload: {
            headers: [
              { name: 'Subject', value: 'Test Subject' },
              { name: 'From', value: 'sender@example.com' },
              { name: 'Date', value: 'Mon, 01 Jan 2024 12:00:00 GMT' },
            ],
            body: { data: 'VGhlIGJvZHk=' }, // base64 encoded "The body"
          },
          internalDate: '1704110400000',
          historyId: '12345',
        },
      });

      const email = await gmailClient.getEmail('msg1');

      expect(email).not.toBeNull();
      expect(email?.id).toBe('msg1');
      expect(email?.subject).toBe('Test Subject');
    });

    it('should return null for non-existent email', async () => {
      mockGmailUsersMessagesGet.mockRejectedValue({ code: 404 });

      const email = await gmailClient.getEmail('nonexistent');

      expect(email).toBeNull();
    });
  });

  describe('getEmails', () => {
    it('should fetch multiple emails by ids', async () => {
      mockGmailUsersMessagesGet.mockResolvedValue({
        data: {
          id: 'msg1',
          threadId: 'thread1',
          labelIds: ['INBOX'],
          snippet: 'Snippet 1',
          payload: {
            headers: [
              { name: 'Subject', value: 'Subject 1' },
              { name: 'From', value: 'sender1@example.com' },
              { name: 'Date', value: 'Mon, 01 Jan 2024 12:00:00 GMT' },
            ],
          },
          internalDate: '1704110400000',
          historyId: '12345',
        },
      });

      const emails = await gmailClient.getEmails(['msg1']);

      expect(emails).toHaveLength(1);
      expect(emails[0].id).toBe('msg1');
    });
  });

  describe('getEmailContent', () => {
    it('should fetch full email content including body', async () => {
      mockGmailUsersMessagesGet.mockResolvedValue({
        data: {
          id: 'msg1',
          threadId: 'thread1',
          labelIds: ['INBOX'],
          snippet: 'Test snippet',
          payload: {
            headers: [
              { name: 'Subject', value: 'Test' },
              { name: 'From', value: 'sender@example.com' },
              { name: 'Date', value: 'Mon, 01 Jan 2024 12:00:00 GMT' },
            ],
            parts: [
              {
                mimeType: 'text/plain',
                body: { data: 'SGVsbG8gV29ybGQ=' }, // "Hello World"
              },
              {
                mimeType: 'text/html',
                body: { data: 'PGgxPkhlbGxvPC9oMT4=' }, // "<h1>Hello</h1>"
              },
            ],
          },
          internalDate: '1704110400000',
          historyId: '12345',
        },
      });

      const email = await gmailClient.getEmailContent('msg1');

      expect(email).not.toBeNull();
      expect(email?.body.text).toBe('Hello World');
      expect(email?.body.html).toBe('<h1>Hello</h1>');
    });
  });

  describe('getCurrentHistoryId', () => {
    it('should return current history id', async () => {
      mockGmailUsersGetProfile.mockResolvedValue({
        data: { historyId: '99999' },
      });

      const historyId = await gmailClient.getCurrentHistoryId();

      expect(historyId).toBe('99999');
    });

    it('should throw error on failure', async () => {
      const { GmailError } = await import('../../../src/core/errors/index.js');
      mockGmailUsersGetProfile.mockRejectedValue(new Error('Network error'));

      await expect(gmailClient.getCurrentHistoryId()).rejects.toThrow(GmailError);
    });
  });

  describe('batch actions', () => {
    it('should archive emails (remove INBOX label)', async () => {
      mockGmailUsersMessagesModify.mockResolvedValue({ data: {} });

      const result = await gmailClient.archiveEmails(['msg1', 'msg2']);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
    });

    it('should delete emails (move to trash)', async () => {
      mockGmailUsersMessagesTrash.mockResolvedValue({ data: {} });

      const result = await gmailClient.deleteEmails(['msg1']);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
    });

    it('should apply labels to emails', async () => {
      mockGmailUsersMessagesModify.mockResolvedValue({ data: {} });

      const result = await gmailClient.labelEmails(['msg1', 'msg2'], 'Label_1');

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
    });

    it('should handle partial failures in batch operations', async () => {
      mockGmailUsersMessagesModify
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await gmailClient.labelEmails(['msg1', 'msg2'], 'Label_1');

      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });
  });
});
