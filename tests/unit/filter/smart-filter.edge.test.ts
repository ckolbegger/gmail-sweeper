/**
 * Unit tests for smart filter edge cases
 *
 * T041: Tests for edge cases like vague descriptions, missing data, long metadata
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email } from '@/core/models/email.js';
import type { AiProvider, EmailClassification } from '@/core/ai/provider.js';
import { runSmartFilter } from '@/core/filter/smart-filter.js';
import { calculateBatchSize } from '@/core/filter/batch-sizing.js';

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

describe('Smart Filter Edge Cases (T041)', () => {
  let mockProvider: AiProvider;

  beforeEach(() => {
    mockProvider = {
      classifyEmails: vi.fn(),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('vague description handling', () => {
    it('should handle vague description "stuff" and return best-effort results', async () => {
      const emails = [
        createTestEmail({ id: 'email-1', subject: 'Random stuff' }),
        createTestEmail({ id: 'email-2', subject: 'Important meeting' }),
      ];

      // AI returns best-effort results for vague description
      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.5, reasoning: 'Contains "stuff"' },
        { emailId: 'email-2', matches: false, confidence: 0.3, reasoning: 'Unclear match' },
      ]);

      const result = await runSmartFilter({
        emails,
        description: 'stuff',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      // Should return results even with vague description
      expect(result.classifications).toHaveLength(2);
      expect(result.filteredEmails).toHaveLength(1);
      expect(result.filteredEmails[0].id).toBe('email-1');
    });

    it('should handle single-word description', async () => {
      const emails = [createTestEmail({ id: 'email-1' })];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.7 },
      ]);

      const result = await runSmartFilter({
        emails,
        description: 'newsletters',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toHaveLength(1);
      expect(mockProvider.classifyEmails).toHaveBeenCalledWith('newsletters', expect.any(Array));
    });
  });

  describe('emails with missing data', () => {
    it('should evaluate emails with no body (only subject/sender)', async () => {
      const emails = [
        createTestEmail({
          id: 'email-1',
          subject: 'No Body Email',
          body: undefined,
          snippet: undefined,
        }),
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.8 },
      ]);

      const result = await runSmartFilter({
        emails,
        description: 'no body',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toHaveLength(1);
      // Verify the email metadata was sent correctly
      expect(mockProvider.classifyEmails).toHaveBeenCalledWith(
        'no body',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'email-1',
            subject: 'No Body Email',
            snippet: undefined,
          }),
        ])
      );
    });

    it('should evaluate emails with empty subject', async () => {
      const emails = [
        createTestEmail({
          id: 'email-1',
          subject: '',
          snippet: 'Some content here',
        }),
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.6 },
      ]);

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toHaveLength(1);
    });

    it('should evaluate emails with missing sender name', async () => {
      const emails = [
        createTestEmail({
          id: 'email-1',
          sender: { email: 'unknown@example.com', name: undefined },
        }),
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.7 },
      ]);

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toHaveLength(1);
      // Verify senderName is empty string when name is undefined
      expect(mockProvider.classifyEmails).toHaveBeenCalledWith(
        'test',
        expect.arrayContaining([
          expect.objectContaining({
            senderName: '',
          }),
        ])
      );
    });
  });

  describe('very long email metadata', () => {
    it('should handle very long subject lines', async () => {
      const longSubject = 'A'.repeat(1000);
      const emails = [
        createTestEmail({
          id: 'email-1',
          subject: longSubject,
        }),
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.8 },
      ]);

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toHaveLength(1);
    });

    it('should handle very long snippets', async () => {
      const longSnippet = 'B'.repeat(2000);
      const emails = [
        createTestEmail({
          id: 'email-1',
          snippet: longSnippet,
        }),
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.8 },
      ]);

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toHaveLength(1);
    });

    it('should adjust batch size for emails with long metadata', () => {
      const emails = [
        createTestEmail({
          id: 'email-1',
          subject: 'A'.repeat(500),
          snippet: 'B'.repeat(500),
        }),
        createTestEmail({
          id: 'email-2',
          subject: 'C'.repeat(500),
          snippet: 'D'.repeat(500),
        }),
      ];

      // Long metadata should result in smaller batch size
      const batchSize = calculateBatchSize(emails, 32000);
      expect(batchSize).toBeGreaterThanOrEqual(1);
      // With very long emails, batch size should be reduced
      expect(batchSize).toBeLessThanOrEqual(emails.length);
    });

    it('should handle many small emails with appropriate batch size', () => {
      const manyEmails = Array.from({ length: 100 }, (_, i) =>
        createTestEmail({
          id: `email-${i}`,
          subject: `Short ${i}`,
          snippet: `Snippet ${i}`,
        })
      );

      const batchSize = calculateBatchSize(manyEmails, 32000);
      expect(batchSize).toBeGreaterThanOrEqual(1);
      // With many small emails, batch size can be larger
      expect(batchSize).toBeGreaterThan(1);
    });
  });

  describe('empty and boundary cases', () => {
    it('should return empty results for empty email list', async () => {
      const result = await runSmartFilter({
        emails: [],
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 32000,
      });

      expect(result.classifications).toEqual([]);
      expect(result.filteredEmails).toEqual([]);
      // Should not call AI provider for empty list
      expect(mockProvider.classifyEmails).not.toHaveBeenCalled();
    });

    it('should reject empty description', async () => {
      const emails = [createTestEmail()];

      await expect(
        runSmartFilter({
          emails,
          description: '',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('Filter description cannot be empty');
    });

    it('should reject whitespace-only description', async () => {
      const emails = [createTestEmail()];

      await expect(
        runSmartFilter({
          emails,
          description: '   ',
          provider: mockProvider,
          maxContextTokens: 32000,
        })
      ).rejects.toThrow('Filter description cannot be empty');
    });
  });
});
