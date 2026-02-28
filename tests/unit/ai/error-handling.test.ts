/**
 * Unit tests for AI error handling
 *
 * T042: Tests for various AI provider error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email } from '@/core/models/email.js';
import type { AiProvider, EmailClassification } from '@/core/ai/provider.js';
import { runSmartFilter } from '@/core/filter/smart-filter.js';

// Helper to create test emails
function createTestEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-id',
    threadId: 'thread-id',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'test@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: 'Test body' },
    labels: [],
    isRead: true,
    snippet: 'Test snippet',
    historyId: '123',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('AI Error Handling (T042)', () => {
  let mockProvider: AiProvider;

  beforeEach(() => {
    mockProvider = {
      classifyEmails: vi.fn(),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('network errors', () => {
    it('should propagate network timeout error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Network timeout: request timed out after 30000ms')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('Network timeout');
    });

    it('should propagate connection refused error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('connect ECONNREFUSED 127.0.0.1:443')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('rate limiting', () => {
    it('should propagate rate limit error (429)', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Rate limit exceeded: 429 Too Many Requests')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('429');
    });

    it('should propagate API quota exceeded error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('API quota exceeded: monthly limit reached')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('quota exceeded');
    });
  });

  describe('malformed responses', () => {
    it('should propagate malformed JSON response error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Failed to parse response as JSON: Unexpected token')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('Failed to parse');
    });

    it('should propagate invalid response structure error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Response is not a JSON array')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('not a JSON array');
    });
  });

  describe('empty responses', () => {
    it('should propagate empty response error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Empty response from provider')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('Empty response');
    });

    it('should handle valid empty array response', async () => {
      const emails = [createTestEmail()];

      // AI returns empty array (no matches)
      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([]);

      const result = await runSmartFilter({
        emails,
        description: 'nonexistent criteria',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toEqual([]);
      expect(result.filteredEmails).toEqual([]);
    });
  });

  describe('partial results', () => {
    it('should propagate error when a batch fails', async () => {
      // Create a single email to test error propagation
      const emails = [createTestEmail({ id: 'email-1' })];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Batch processing failed')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('Batch processing failed');
    });

    it('should accumulate results from provider calls', async () => {
      const emails = Array.from({ length: 4 }, (_, i) =>
        createTestEmail({ id: `email-${i}` })
      );

      // Provider returns all classifications in one call
      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-0', matches: true, confidence: 0.9 },
        { emailId: 'email-1', matches: false, confidence: 0.3 },
        { emailId: 'email-2', matches: true, confidence: 0.8 },
        { emailId: 'email-3', matches: true, confidence: 0.7 },
      ] as EmailClassification[]);

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      // All classifications accumulated
      expect(result.classifications).toHaveLength(4);
      // Only matching emails in filtered list
      expect(result.filteredEmails).toHaveLength(3);
      // Results sorted by confidence
      expect(result.filteredEmails[0].id).toBe('email-0');
      expect(result.filteredEmails[1].id).toBe('email-2');
      expect(result.filteredEmails[2].id).toBe('email-3');
    });
  });

  describe('authentication errors', () => {
    it('should propagate authentication error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Authentication failed: invalid API key')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('invalid API key');
    });

    it('should propagate expired token error', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(
        new Error('Authentication failed: token expired')
      );

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('token expired');
    });
  });

  describe('unknown errors', () => {
    it('should handle non-Error thrown values', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue('string error');

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow();
    });

    it('should handle null thrown values', async () => {
      const emails = [createTestEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValue(null);

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow();
    });
  });
});
