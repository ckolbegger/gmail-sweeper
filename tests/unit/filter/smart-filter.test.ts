import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSmartFilter } from '@/core/filter/smart-filter.js';
import type { AiProvider, EmailClassification, EmailMetadata } from '@/core/ai/provider.js';
import type { Email } from '@/core/models/email.js';

// Mock calculateBatchSize
vi.mock('@/core/filter/batch-sizing.js', () => ({
  calculateBatchSize: vi.fn(),
}));

import { calculateBatchSize } from '@/core/filter/batch-sizing.js';

const mockCalculateBatchSize = vi.mocked(calculateBatchSize);

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

// Helper to create mock AI provider
function createMockProvider(
  classifications: Map<string, EmailClassification[]> = new Map()
): AiProvider {
  return {
    classifyEmails: vi.fn(async (description: string, emails: EmailMetadata[]) => {
      const key = `${description}-${emails.length}`;
      if (classifications.has(key)) {
        return classifications.get(key)!;
      }
      // Default: return all as matching with medium confidence
      return emails.map((e) => ({
        emailId: e.id,
        matches: true,
        confidence: 0.7,
      }));
    }),
  };
}

describe('runSmartFilter', () => {
  let mockProvider: AiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
    // Default: return batch size of 10
    mockCalculateBatchSize.mockReturnValue(10);
  });

  describe('token-aware batching', () => {
    it('splits emails into token-aware batches using calculateBatchSize', async () => {
      const emails = Array.from({ length: 25 }, (_, i) =>
        createTestEmail({ id: `email-${i}`, subject: `Subject ${i}` })
      );

      // Set batch size to 10, so we expect 3 batches (10, 10, 5)
      mockCalculateBatchSize.mockReturnValue(10);

      const classifySpy = vi.spyOn(mockProvider, 'classifyEmails');

      await runSmartFilter({
        emails,
        description: 'financial offers',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      // Verify calculateBatchSize was called with correct args
      expect(mockCalculateBatchSize).toHaveBeenCalledWith(emails, 4000);

      // Verify 3 batches were processed
      expect(classifySpy).toHaveBeenCalledTimes(3);

      // Verify batch sizes
      expect(classifySpy).toHaveBeenNthCalledWith(
        1,
        'financial offers',
        expect.arrayContaining([expect.objectContaining({ id: 'email-0' })])
      );
      const firstCallEmails = classifySpy.mock.calls[0][1];
      expect(firstCallEmails).toHaveLength(10);

      const secondCallEmails = classifySpy.mock.calls[1][1];
      expect(secondCallEmails).toHaveLength(10);

      const thirdCallEmails = classifySpy.mock.calls[2][1];
      expect(thirdCallEmails).toHaveLength(5);
    });

    it('respects dynamic batch size based on token limits', async () => {
      const emails = Array.from({ length: 20 }, (_, i) =>
        createTestEmail({ id: `email-${i}` })
      );

      // Small batch size
      mockCalculateBatchSize.mockReturnValue(5);

      const classifySpy = vi.spyOn(mockProvider, 'classifyEmails');

      await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 1000,
      });

      // 20 emails / 5 per batch = 4 calls
      expect(classifySpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('progress callback', () => {
    it('calls onProgress callback after each batch', async () => {
      const emails = Array.from({ length: 25 }, (_, i) =>
        createTestEmail({ id: `email-${i}` })
      );

      mockCalculateBatchSize.mockReturnValue(10);

      const onProgress = vi.fn();

      await runSmartFilter({
        emails,
        description: 'test filter',
        provider: mockProvider,
        maxContextTokens: 4000,
        onProgress,
      });

      // 3 batches: (10, 25), (20, 25), (25, 25)
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, 10, 25);
      expect(onProgress).toHaveBeenNthCalledWith(2, 20, 25);
      expect(onProgress).toHaveBeenNthCalledWith(3, 25, 25);
    });

    it('does not call onProgress if not provided', async () => {
      const emails = [createTestEmail()];

      // Should not throw
      await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 4000,
      });
    });
  });

  describe('result sorting', () => {
    it('returns combined results sorted by confidence descending', async () => {
      const emails = [
        createTestEmail({ id: 'email-1' }),
        createTestEmail({ id: 'email-2' }),
        createTestEmail({ id: 'email-3' }),
      ];

      // Provider returns classifications in mixed order
      mockProvider = createMockProvider(
        new Map([
          [
            'test-3',
            [
              { emailId: 'email-1', matches: true, confidence: 0.5 },
              { emailId: 'email-2', matches: true, confidence: 0.9 },
              { emailId: 'email-3', matches: true, confidence: 0.3 },
            ],
          ],
        ])
      );

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      // Classifications should be sorted by confidence descending
      expect(result.classifications).toHaveLength(3);
      expect(result.classifications[0].emailId).toBe('email-2'); // 0.9
      expect(result.classifications[1].emailId).toBe('email-1'); // 0.5
      expect(result.classifications[2].emailId).toBe('email-3'); // 0.3

      // Confidence values should be in descending order
      expect(result.classifications[0].confidence).toBe(0.9);
      expect(result.classifications[1].confidence).toBe(0.5);
      expect(result.classifications[2].confidence).toBe(0.3);
    });

    it('filteredEmails contains only matching emails sorted by confidence', async () => {
      const emails = [
        createTestEmail({ id: 'email-1', subject: 'First' }),
        createTestEmail({ id: 'email-2', subject: 'Second' }),
        createTestEmail({ id: 'email-3', subject: 'Third' }),
        createTestEmail({ id: 'email-4', subject: 'Fourth' }),
      ];

      mockProvider = createMockProvider(
        new Map([
          [
            'test-4',
            [
              { emailId: 'email-1', matches: false, confidence: 0.9 },
              { emailId: 'email-2', matches: true, confidence: 0.8 },
              { emailId: 'email-3', matches: true, confidence: 0.95 },
              { emailId: 'email-4', matches: false, confidence: 0.1 },
            ],
          ],
        ])
      );

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      // Only matching emails
      expect(result.filteredEmails).toHaveLength(2);

      // Sorted by confidence (email-3 has 0.95, email-2 has 0.8)
      expect(result.filteredEmails[0].id).toBe('email-3');
      expect(result.filteredEmails[1].id).toBe('email-2');
    });
  });

  describe('cancellation', () => {
    it('respects AbortSignal for cancellation', async () => {
      const emails = Array.from({ length: 20 }, (_, i) =>
        createTestEmail({ id: `email-${i}` })
      );

      mockCalculateBatchSize.mockReturnValue(5);

      const controller = new AbortController();
      const onProgress = vi.fn(() => {
        // Abort after first batch completes
        if (onProgress.mock.calls.length === 1) {
          controller.abort();
        }
      });

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 4000,
          onProgress,
          signal: controller.signal,
        })
      ).rejects.toThrow('Smart filter operation was aborted');

      // Should have only processed first batch before abort
      expect(onProgress).toHaveBeenCalledTimes(1);
    });

    it('throws immediately if signal is already aborted', async () => {
      const emails = [createTestEmail()];
      const controller = new AbortController();
      controller.abort();

      await expect(
        runSmartFilter({
          emails,
          description: 'test',
          provider: mockProvider,
          maxContextTokens: 4000,
          signal: controller.signal,
        })
      ).rejects.toThrow('Smart filter operation was aborted');
    });
  });

  describe('edge cases', () => {
    it('handles empty email list', async () => {
      const result = await runSmartFilter({
        emails: [],
        description: 'test filter',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      expect(result.classifications).toEqual([]);
      expect(result.filteredEmails).toEqual([]);

      // Should not call the provider
      expect(mockProvider.classifyEmails).not.toHaveBeenCalled();
    });

    it('handles single email', async () => {
      const email = createTestEmail({ id: 'single-email' });

      mockProvider = createMockProvider(
        new Map([
          [
            'test-1',
            [{ emailId: 'single-email', matches: true, confidence: 0.85 }],
          ],
        ])
      );

      const result = await runSmartFilter({
        emails: [email],
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      expect(result.classifications).toHaveLength(1);
      expect(result.filteredEmails).toHaveLength(1);
      expect(result.filteredEmails[0].id).toBe('single-email');
    });

    it('handles all emails being filtered out (no matches)', async () => {
      const emails = [
        createTestEmail({ id: 'email-1' }),
        createTestEmail({ id: 'email-2' }),
      ];

      mockProvider = createMockProvider(
        new Map([
          [
            'test-2',
            [
              { emailId: 'email-1', matches: false, confidence: 0.9 },
              { emailId: 'email-2', matches: false, confidence: 0.8 },
            ],
          ],
        ])
      );

      const result = await runSmartFilter({
        emails,
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      expect(result.classifications).toHaveLength(2);
      expect(result.filteredEmails).toEqual([]);
    });
  });

  describe('validation (FR-013)', () => {
    it('rejects empty description', async () => {
      const emails = [createTestEmail()];

      await expect(
        runSmartFilter({
          emails,
          description: '',
          provider: mockProvider,
          maxContextTokens: 4000,
        })
      ).rejects.toThrow('Filter description cannot be empty');
    });

    it('rejects whitespace-only description', async () => {
      const emails = [createTestEmail()];

      await expect(
        runSmartFilter({
          emails,
          description: '   ',
          provider: mockProvider,
          maxContextTokens: 4000,
        })
      ).rejects.toThrow('Filter description cannot be empty');
    });
  });

  describe('EmailMetadata conversion', () => {
    it('correctly converts Email to EmailMetadata', async () => {
      const email = createTestEmail({
        id: 'conv-test',
        subject: 'Conversion Test',
        sender: { name: 'Sender Name', email: 'sender@test.com' },
        snippet: 'This is a snippet',
      });

      const classifySpy = vi.fn().mockResolvedValue([
        { emailId: 'conv-test', matches: true, confidence: 0.9 },
      ]);

      mockProvider = { classifyEmails: classifySpy };

      await runSmartFilter({
        emails: [email],
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      // Verify the EmailMetadata structure passed to provider
      expect(classifySpy).toHaveBeenCalledWith('test', [
        {
          id: 'conv-test',
          subject: 'Conversion Test',
          senderName: 'Sender Name',
          senderEmail: 'sender@test.com',
          snippet: 'This is a snippet',
        },
      ]);
    });

    it('handles missing sender name gracefully', async () => {
      const email = createTestEmail({
        id: 'no-name',
        sender: { email: 'noname@test.com' }, // No name field
      });

      const classifySpy = vi.fn().mockResolvedValue([
        { emailId: 'no-name', matches: true, confidence: 0.9 },
      ]);

      mockProvider = { classifyEmails: classifySpy };

      await runSmartFilter({
        emails: [email],
        description: 'test',
        provider: mockProvider,
        maxContextTokens: 4000,
      });

      const metadata = classifySpy.mock.calls[0][1][0];
      expect(metadata.senderName).toBe('');
    });
  });
});
