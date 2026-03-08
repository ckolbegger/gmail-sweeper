/**
 * T026: Integration test for full smart filter cycle.
 *
 * Tests runSmartFilter + calculateBatchSize + mock AiProvider together.
 * Verifies: activate → evaluate batches → progressive results → final sorted output.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Email, EmailAddress, Label } from '../../src/core/models/index.js';
import type {
  AiProvider,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse,
  EmailClassification,
} from '../../src/core/ai/provider.js';
import { runSmartFilter } from '../../src/core/filter/smart-filter.js';
import type { FilterProgress } from '../../src/core/filter/smart-filter.js';

function createTestEmail(id: string, overrides?: Partial<Email>): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: overrides?.subject ?? `Subject ${id}`,
    sender: overrides?.sender ?? ({ email: `sender${id}@example.com`, name: `Sender ${id}` } as EmailAddress),
    recipients: [{ email: 'recipient@example.com' }],
    date: overrides?.date ?? new Date(),
    snippet: overrides?.snippet ?? `Snippet for email ${id}`,
    labels: [] as Label[],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function createMockProvider(
  responseMap: (request: ClassifyEmailsRequest) => ClassifyEmailsResponse,
): AiProvider {
  return {
    classifyEmails: vi.fn().mockImplementation(responseMap),
  };
}

describe('T026: Smart Filter Integration', () => {
  const emails = [
    createTestEmail('1', { subject: 'Meeting invite: Q1 planning', snippet: 'Join us for quarterly planning session' }),
    createTestEmail('2', { subject: 'Newsletter: Weekly digest', snippet: 'Here are this weeks top stories' }),
    createTestEmail('3', { subject: 'Meeting notes: Standup', snippet: 'Summary of today standup meeting' }),
    createTestEmail('4', { subject: 'Promo: 50% off sale', snippet: 'Limited time offer on all products' }),
    createTestEmail('5', { subject: 'Meeting reminder: 1-on-1', snippet: 'Your upcoming 1-on-1 with manager' }),
  ];

  // Mock provider returns matching for meeting-related emails
  const mockProvider = createMockProvider((request) => {
    const results: EmailClassification[] = request.emails.map((e) => {
      const isMeeting = e.subject.toLowerCase().includes('meeting');
      return {
        emailId: e.id,
        matches: isMeeting,
        confidence: isMeeting ? 0.95 : 0.1,
        reasoning: isMeeting ? 'Contains meeting keyword' : 'Not meeting related',
      };
    });
    return { results };
  });

  it('should return only matching emails sorted by confidence descending', async () => {
    const result = await runSmartFilter({
      description: 'meeting invites and reminders',
      emails,
      provider: mockProvider,
    });

    expect(result.totalEvaluated).toBe(5);
    expect(result.matchingResults).toHaveLength(3);
    // All matching are meetings
    expect(result.matchingResults.every((r) => r.matches)).toBe(true);
    // Sorted by confidence desc
    for (let i = 1; i < result.matchingResults.length; i++) {
      expect(result.matchingResults[i]!.confidence).toBeLessThanOrEqual(
        result.matchingResults[i - 1]!.confidence,
      );
    }
    // Non-matching in allResults
    expect(result.allResults).toHaveLength(5);
    expect(result.allResults.filter((r) => !r.matches)).toHaveLength(2);
  });

  it('should call onProgress after each batch', async () => {
    const progressUpdates: FilterProgress[] = [];
    const onProgress = vi.fn((p: FilterProgress) => progressUpdates.push({ ...p }));

    await runSmartFilter({
      description: 'meeting invites',
      emails,
      provider: mockProvider,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    // Final progress should show all evaluated
    const lastProgress = progressUpdates[progressUpdates.length - 1]!;
    expect(lastProgress.evaluatedCount).toBe(5);
    expect(lastProgress.totalCount).toBe(5);
    expect(lastProgress.currentBatch).toBe(lastProgress.totalBatches);
  });

  it('should handle empty email list', async () => {
    const result = await runSmartFilter({
      description: 'anything',
      emails: [],
      provider: mockProvider,
    });

    expect(result.allResults).toHaveLength(0);
    expect(result.matchingResults).toHaveLength(0);
    expect(result.totalEvaluated).toBe(0);
  });

  it('should reject empty description', async () => {
    await expect(
      runSmartFilter({
        description: '',
        emails,
        provider: mockProvider,
      }),
    ).rejects.toThrow('empty');
  });

  it('should respect AbortSignal cancellation', async () => {
    const controller = new AbortController();
    // Abort before starting
    controller.abort();

    await expect(
      runSmartFilter({
        description: 'meetings',
        emails,
        provider: mockProvider,
        signal: controller.signal,
      }),
    ).rejects.toThrow('aborted');
  });

  it('should call provider with correct filter description', async () => {
    const trackingProvider = createMockProvider((request) => ({
      results: request.emails.map((e) => ({
        emailId: e.id,
        matches: false,
        confidence: 0.1,
      })),
    }));

    await runSmartFilter({
      description: 'urgent bugs',
      emails: [createTestEmail('x')],
      provider: trackingProvider,
    });

    expect(trackingProvider.classifyEmails).toHaveBeenCalledWith(
      expect.objectContaining({ filterDescription: 'urgent bugs' }),
    );
  });

  it('should convert Email to EmailMetadata correctly', async () => {
    const trackingProvider = createMockProvider((request) => {
      // Verify metadata shape
      const meta = request.emails[0]!;
      expect(meta).toHaveProperty('id', 'conv-1');
      expect(meta).toHaveProperty('subject', 'Test Subject');
      expect(meta).toHaveProperty('senderName', 'Alice');
      expect(meta).toHaveProperty('senderEmail', 'alice@test.com');
      expect(meta).toHaveProperty('snippet', 'Hello world');

      return { results: [{ emailId: meta.id, matches: true, confidence: 0.9 }] };
    });

    const email = createTestEmail('conv-1', {
      subject: 'Test Subject',
      sender: { email: 'alice@test.com', name: 'Alice' },
      snippet: 'Hello world',
    });

    await runSmartFilter({
      description: 'test filter',
      emails: [email],
      provider: trackingProvider,
    });

    expect(trackingProvider.classifyEmails).toHaveBeenCalled();
  });
});
