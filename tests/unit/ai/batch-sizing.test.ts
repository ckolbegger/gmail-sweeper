import { describe, it, expect } from 'vitest';
import { estimateTokens, calculateBatchSize } from '@/core/filter/batch-sizing.js';
import type { EmailMetadata } from '@/core/ai/provider.js';

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 1 for 4 characters', () => {
    expect(estimateTokens('test')).toBe(1);
  });

  it('returns 25 for 100 characters', () => {
    expect(estimateTokens('a'.repeat(100))).toBe(25);
  });
});

describe('calculateBatchSize', () => {
  const createEmail = (charCount: number): EmailMetadata => ({
    id: 'email-1',
    subject: 'x'.repeat(charCount),
    senderName: 'Test Sender',
    senderEmail: 'test@example.com',
    snippet: 'x'.repeat(charCount),
  });

  it('returns at least 1 even for large emails', () => {
    const largeEmails = Array(10).fill(null).map(() => createEmail(10000));
    const batchSize = calculateBatchSize(largeEmails, 32000);
    expect(batchSize).toBeGreaterThanOrEqual(1);
  });

  it('returns larger batch size for small emails', () => {
    const smallEmails = Array(100).fill(null).map(() => createEmail(50));
    const batchSize = calculateBatchSize(smallEmails, 32000);
    expect(batchSize).toBeGreaterThan(1);
  });

  it('returns smaller batch size for large emails', () => {
    const largeEmails = Array(10).fill(null).map(() => createEmail(5000));
    const smallEmails = Array(100).fill(null).map(() => createEmail(100));

    const largeBatchSize = calculateBatchSize(largeEmails, 32000);
    const smallBatchSize = calculateBatchSize(smallEmails, 32000);

    expect(largeBatchSize).toBeLessThan(smallBatchSize);
  });

  it('respects 70% budget allocation for email content', () => {
    // Each email has ~1000 chars (~250 tokens)
    // With 32000 max tokens, 70% = 22400 tokens for emails
    // Expected batch size ~22400 / 250 = ~89 emails
    const mediumEmails = Array(100).fill(null).map(() => createEmail(1000));
    const batchSize = calculateBatchSize(mediumEmails, 32000);

    // 70% of 32000 = 22400, divided by ~250 tokens per email = ~89
    expect(batchSize).toBeGreaterThan(50);
    expect(batchSize).toBeLessThan(100);
  });

  it('returns 1 for empty array', () => {
    const batchSize = calculateBatchSize([], 32000);
    expect(batchSize).toBe(1);
  });

  it('returns 1 for single email regardless of size', () => {
    const hugeEmail = createEmail(50000);
    const batchSize = calculateBatchSize([hugeEmail], 32000);
    expect(batchSize).toBe(1);
  });
});
