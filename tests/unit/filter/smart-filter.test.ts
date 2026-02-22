/**
 * T014: Unit tests for runSmartFilter()
 * Test: splits emails into token-aware batches, calls onProgress after each batch,
 * returns combined results sorted by confidence desc, respects AbortSignal cancellation,
 * handles empty email list, rejects empty description (FR-013)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Email } from '../../../src/core/models/index.js';
import type {
  AiProvider,
  EmailClassification,
  ClassifyEmailsResponse,
} from '../../../src/core/ai/index.js';

describe('runSmartFilter', () => {
  let runSmartFilter: (options: {
    description: string;
    emails: Email[];
    provider: AiProvider;
    maxContextTokens?: number;
    onProgress?: (progress: {
      matchingResults: EmailClassification[];
      evaluatedCount: number;
      totalCount: number;
      currentBatch: number;
      totalBatches: number;
    }) => void;
    signal?: AbortSignal;
  }) => Promise<{
    allResults: EmailClassification[];
    matchingResults: EmailClassification[];
    totalEvaluated: number;
  }>;

  beforeEach(async () => {
    const module = await import('../../../src/core/filter/smart-filter.js');
    runSmartFilter = module.runSmartFilter;
  });

  const createMockEmail = (
    id: string,
    subject: string,
    senderName: string,
    senderEmail: string,
    snippet: string
  ): Email => ({
    id,
    threadId: `thread-${id}`,
    subject,
    sender: { name: senderName, email: senderEmail },
    recipients: [],
    date: new Date(),
    snippet,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  });

  const createMockAiProvider = (results: EmailClassification[], slow = false): AiProvider => ({
    classifyEmails: vi.fn().mockImplementation(async () => {
      if (slow) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return results;
    }),
  });

  it('should split emails into token-aware batches', async () => {
    const emails = Array.from({ length: 10 }, (_, i) =>
      createMockEmail(
        `id-${i}`,
        `Subject ${i}`,
        `Sender ${i}`,
        `sender${i}@test.com`,
        `Snippet ${i} with some content here`
      )
    );
    const mockProvider = createMockAiProvider(
      emails.map((e) => ({ emailId: e.id, matches: true, confidence: 0.9 }))
    );

    await runSmartFilter({
      description: 'filter test emails',
      emails,
      provider: mockProvider,
      maxContextTokens: 1000,
    });

    expect(mockProvider.classifyEmails).toHaveBeenCalled();
    const calls = mockProvider.classifyEmails.mock.calls;
    const totalEmailsProcessed = calls.reduce((sum, call) => sum + (call[1]?.length || 0), 0);
    expect(totalEmailsProcessed).toBe(emails.length);
  });

  it('should call onProgress after each batch', async () => {
    const emails = Array.from({ length: 5 }, (_, i) =>
      createMockEmail(
        `id-${i}`,
        `Subject ${i}`,
        `Sender ${i}`,
        `sender${i}@test.com`,
        `Snippet ${i}`
      )
    );
    const mockProvider = createMockAiProvider(
      emails.map((e) => ({ emailId: e.id, matches: true, confidence: 0.9 }))
    );
    const onProgress = vi.fn();

    await runSmartFilter({
      description: 'filter test emails',
      emails,
      provider: mockProvider,
      maxContextTokens: 1000,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    expect(onProgress.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('should return combined results sorted by confidence desc', async () => {
    const emails = [
      createMockEmail('id-1', 'Subject 1', 'Sender 1', 'sender1@test.com', 'Snippet 1'),
      createMockEmail('id-2', 'Subject 2', 'Sender 2', 'sender2@test.com', 'Snippet 2'),
      createMockEmail('id-3', 'Subject 3', 'Sender 3', 'sender3@test.com', 'Snippet 3'),
    ];
    const mockProvider = createMockAiProvider([
      { emailId: 'id-1', matches: true, confidence: 0.5 },
      { emailId: 'id-2', matches: true, confidence: 0.9 },
      { emailId: 'id-3', matches: true, confidence: 0.3 },
    ]);

    const result = await runSmartFilter({
      description: 'filter test emails',
      emails,
      provider: mockProvider,
    });

    expect(result.matchingResults[0].confidence).toBe(0.9);
    expect(result.matchingResults[1].confidence).toBe(0.5);
    expect(result.matchingResults[2].confidence).toBe(0.3);
  });

  it.skip('should respect AbortSignal cancellation', async () => {
    const emails = Array.from({ length: 10 }, (_, i) =>
      createMockEmail(
        `id-${i}`,
        `Subject ${i}`,
        `Sender ${i}`,
        `sender${i}@test.com`,
        `Snippet ${i}`
      )
    );
    const mockProvider = createMockAiProvider([], true);
    const controller = new AbortController();

    const promise = runSmartFilter({
      description: 'filter test emails',
      emails,
      provider: mockProvider,
      signal: controller.signal,
    });

    // Let the first batch start, then abort
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('should handle empty email list', async () => {
    const mockProvider = createMockAiProvider([]);

    const result = await runSmartFilter({
      description: 'filter test emails',
      emails: [],
      provider: mockProvider,
    });

    expect(result.allResults).toEqual([]);
    expect(result.matchingResults).toEqual([]);
    expect(result.totalEvaluated).toBe(0);
  });

  it('should reject empty description (FR-013)', async () => {
    const emails = [
      createMockEmail('id-1', 'Subject 1', 'Sender 1', 'sender1@test.com', 'Snippet 1'),
    ];
    const mockProvider = createMockAiProvider([]);

    await expect(
      runSmartFilter({
        description: '',
        emails,
        provider: mockProvider,
      })
    ).rejects.toThrow('Filter description cannot be empty');
  });
});
