import { describe, expect, it } from 'vitest';

import { calculateBatchSize, estimateTokens } from '@/services/batch_sizing.js';

describe('batch sizing', () => {
  it('should estimate tokens with chars/4 heuristic', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('should reserve 30% and use 70% of max context for emails', () => {
    const size = calculateBatchSize([1000, 1000, 1000], 10000);
    // 70% of 10000 = 7000, each email=1000 => 7 emails max
    expect(size).toBe(7);
  });

  it('should always return a minimum batch size of 1', () => {
    const size = calculateBatchSize([50000], 32000);
    expect(size).toBe(1);
  });

  it('should produce smaller batches for large emails', () => {
    const large = calculateBatchSize([5000, 5000, 5000], 32000);
    const small = calculateBatchSize([200, 200, 200], 32000);

    expect(large).toBeLessThan(small);
  });
});
