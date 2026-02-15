/**
 * T011: Unit tests for estimateTokens() and calculateBatchSize().
 *
 * estimateTokens: chars/4 heuristic
 * calculateBatchSize: 70% budget for emails, min batch size 1, dynamic sizing
 */

import { describe, it, expect } from 'vitest';
import type { EmailMetadata } from '../../../src/core/ai/provider.js';
import { estimateTokens, calculateBatchSize } from '../../../src/core/filter/batch-sizing.js';

describe('estimateTokens', () => {
  it('should estimate tokens as chars / 4', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('should handle empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should floor the result', () => {
    // 5 chars / 4 = 1.25 → 1
    expect(estimateTokens('abcde')).toBe(1);
  });

  it('should handle longer text', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });
});

describe('calculateBatchSize', () => {
  function makeEmail(overrides: Partial<EmailMetadata> = {}): EmailMetadata {
    return {
      id: '1',
      subject: 'Test Subject',
      senderName: 'Sender',
      senderEmail: 'sender@example.com',
      snippet: 'Short snippet',
      ...overrides,
    };
  }

  it('should allocate 70% of token budget for emails', () => {
    // With maxContextTokens=1000, email budget = 700
    // Small emails ~= few tokens each, so batch should be > 1
    const emails = Array.from({ length: 50 }, () => makeEmail());
    const batchSize = calculateBatchSize(emails, 1000);
    // Each email serialized is relatively small; batch should fit many
    expect(batchSize).toBeGreaterThan(1);
    expect(batchSize).toBeLessThanOrEqual(100);
  });

  it('should enforce minimum batch size of 1', () => {
    // Very large email with tiny context window
    const emails = [makeEmail({
      subject: 'x'.repeat(10000),
      snippet: 'y'.repeat(10000),
    })];
    const batchSize = calculateBatchSize(emails, 100);
    expect(batchSize).toBe(1);
  });

  it('should return smaller batches for large emails', () => {
    const largeEmails = Array.from({ length: 20 }, () =>
      makeEmail({
        subject: 'x'.repeat(2000),
        snippet: 'y'.repeat(2000),
      }),
    );
    const smallEmails = Array.from({ length: 20 }, () => makeEmail());

    const largeBatch = calculateBatchSize(largeEmails, 32000);
    const smallBatch = calculateBatchSize(smallEmails, 32000);

    expect(largeBatch).toBeLessThan(smallBatch);
  });

  it('should return larger batches for small emails', () => {
    const smallEmails = Array.from({ length: 100 }, () => makeEmail());
    const batchSize = calculateBatchSize(smallEmails, 32000);
    // Small emails should allow many per batch
    expect(batchSize).toBeGreaterThan(10);
  });

  it('should default maxContextTokens to 32000', () => {
    const emails = Array.from({ length: 20 }, () => makeEmail());
    const withDefault = calculateBatchSize(emails);
    const withExplicit = calculateBatchSize(emails, 32000);
    expect(withDefault).toBe(withExplicit);
  });
});
