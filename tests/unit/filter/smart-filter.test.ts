/**
 * T020: Unit tests for runSmartFilter().
 *
 * Tests batch orchestration, progress callbacks, sorting,
 * cancellation, empty inputs, and validation.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Email } from '../../../src/core/models/index.js';
import type {
  AiProvider,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse,
} from '../../../src/core/ai/provider.js';
import { runSmartFilter } from '../../../src/core/filter/smart-filter.js';
import type { FilterProgress } from '../../../src/core/filter/smart-filter.js';

function makeEmail(id: string, subject = 'Test Subject'): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject,
    sender: { email: 'sender@example.com', name: 'Sender' },
    recipients: [],
    date: new Date('2026-01-01'),
    snippet: 'A short snippet',
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeMockProvider(
  responses: ClassifyEmailsResponse[],
): AiProvider & { classifyEmails: ReturnType<typeof vi.fn> } {
  let callIndex = 0;
  const classifyEmails = vi.fn(async (_req: ClassifyEmailsRequest) => {
    const resp = responses[callIndex];
    if (!resp) throw new Error(`Unexpected call #${callIndex}`);
    callIndex++;
    return resp;
  });
  return { classifyEmails };
}

describe('runSmartFilter', () => {
  it('splits emails into token-aware batches using calculateBatchSize()', async () => {
    // Use large emails with a small context budget to force multiple batches.
    // Each email serialized: id + long subject + name + email + long snippet ≈ lots of tokens.
    const emails = Array.from({ length: 4 }, (_, i) =>
      makeEmail(`${i}`, 'x'.repeat(500)),
    );
    // 4 large emails, tiny context → multiple batches expected
    const responses: ClassifyEmailsResponse[] = [];
    for (let i = 0; i < 4; i++) {
      responses.push({
        results: [{ emailId: `${i}`, matches: false, confidence: 0.3 }],
      });
    }
    const provider = makeMockProvider(responses);

    await runSmartFilter({
      description: 'newsletters',
      emails,
      provider,
      maxContextTokens: 500, // tiny budget with large emails → multiple batches
    });

    // Should have been called multiple times (more than 1 batch)
    expect(provider.classifyEmails.mock.calls.length).toBeGreaterThan(1);
  });

  it('calls onProgress after each batch with progressive results', async () => {
    // Use large subjects to force 1-email batches with small context
    const emails = [
      makeEmail('1', 'x'.repeat(2000)),
      makeEmail('2', 'x'.repeat(2000)),
    ];
    const provider = makeMockProvider([
      { results: [{ emailId: '1', matches: true, confidence: 0.9 }] },
      { results: [{ emailId: '2', matches: false, confidence: 0.2 }] },
    ]);
    const onProgress = vi.fn();

    await runSmartFilter({
      description: 'important',
      emails,
      provider,
      maxContextTokens: 800, // force 2 batches: each email ~500 tokens, budget=560
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledTimes(2);
    // First call: 1 evaluated
    const first: FilterProgress = onProgress.mock.calls[0][0];
    expect(first.evaluatedCount).toBe(1);
    expect(first.currentBatch).toBe(1);
    expect(first.totalCount).toBe(2);
    // Second call: 2 evaluated
    const second: FilterProgress = onProgress.mock.calls[1][0];
    expect(second.evaluatedCount).toBe(2);
    expect(second.currentBatch).toBe(2);
  });

  it('returns combined results sorted by confidence descending', async () => {
    const emails = [makeEmail('a'), makeEmail('b'), makeEmail('c')];
    const provider = makeMockProvider([
      {
        results: [
          { emailId: 'a', matches: true, confidence: 0.5 },
          { emailId: 'b', matches: true, confidence: 0.9 },
          { emailId: 'c', matches: true, confidence: 0.7 },
        ],
      },
    ]);

    const result = await runSmartFilter({
      description: 'test',
      emails,
      provider,
    });

    expect(result.matchingResults.map((r) => r.emailId)).toEqual(['b', 'c', 'a']);
    expect(result.allResults).toHaveLength(3);
    expect(result.totalEvaluated).toBe(3);
  });

  it('respects AbortSignal cancellation', async () => {
    const emails = [
      makeEmail('1', 'x'.repeat(2000)),
      makeEmail('2', 'x'.repeat(2000)),
    ];
    const controller = new AbortController();
    // Provider aborts after first call
    const provider: AiProvider = {
      classifyEmails: vi.fn(async () => {
        controller.abort();
        return { results: [{ emailId: '1', matches: false, confidence: 0.1 }] };
      }),
    };

    await expect(
      runSmartFilter({
        description: 'test',
        emails,
        provider,
        maxContextTokens: 800, // force multiple batches with large emails
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it('handles empty email list', async () => {
    const provider = makeMockProvider([]);

    const result = await runSmartFilter({
      description: 'test',
      emails: [],
      provider,
    });

    expect(result).toEqual({
      allResults: [],
      matchingResults: [],
      totalEvaluated: 0,
    });
    expect(provider.classifyEmails).not.toHaveBeenCalled();
  });

  it('rejects empty description (FR-013)', async () => {
    const provider = makeMockProvider([]);

    await expect(
      runSmartFilter({ description: '', emails: [], provider }),
    ).rejects.toThrow(/description/i);

    await expect(
      runSmartFilter({ description: '   ', emails: [], provider }),
    ).rejects.toThrow(/description/i);
  });
});
