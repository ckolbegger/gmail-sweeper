import { describe, it, expect } from 'vitest';
import { estimateTokens, calculateBatchSize } from '../../../src/core/filter/batch-sizing.js';

describe('estimateTokens', () => {
  it('should estimate tokens using chars/4 formula', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
    expect(estimateTokens('abcdefghijklmnop')).toBe(4);
  });

  it('should handle empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('should round up partial tokens', () => {
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('abcdefghi')).toBe(3);
  });
});

describe('calculateBatchSize', () => {
  it('should allocate 70% of token budget for emails', () => {
    const emails = Array(10).fill({ text: 'a'.repeat(400) });
    const maxTokens = 1000;

    const batchSize = calculateBatchSize(emails, maxTokens);

    expect(batchSize).toBe(7);
  });

  it('should return minimum batch size of 1', () => {
    const emails = [{ text: 'a'.repeat(4000) }];
    const maxTokens = 1000;

    const batchSize = calculateBatchSize(emails, maxTokens);

    expect(batchSize).toBe(1);
  });

  it('should handle large emails with smaller batches', () => {
    const emails = Array(10).fill({ text: 'a'.repeat(400) });
    const maxTokens = 500;

    const batchSize = calculateBatchSize(emails, maxTokens);

    expect(batchSize).toBe(3);
  });

  it('should handle small emails with larger batches', () => {
    const emails = Array(100).fill({ text: 'a'.repeat(40) });
    const maxTokens = 1000;

    const batchSize = calculateBatchSize(emails, maxTokens);

    expect(batchSize).toBe(70);
  });

  it('should not exceed total email count', () => {
    const emails = Array(5).fill({ text: 'a'.repeat(40) });
    const maxTokens = 10000;

    const batchSize = calculateBatchSize(emails, maxTokens);

    expect(batchSize).toBe(5);
  });

  it('should handle empty email array', () => {
    const emails: Array<{ text: string }> = [];
    const maxTokens = 1000;

    const batchSize = calculateBatchSize(emails, maxTokens);

    expect(batchSize).toBe(0);
  });

  it('should use default maxTokens of 32000 when not specified', () => {
    const emails = Array(100).fill({ text: 'a'.repeat(400) });

    const batchSize = calculateBatchSize(emails);

    expect(batchSize).toBe(100);
  });
});
