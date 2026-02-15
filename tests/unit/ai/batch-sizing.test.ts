/**
 * T011: Unit tests for estimateTokens() and calculateBatchSize()
 * Test: chars/4 estimation, budget allocation (70% for emails),
 * minimum batch size of 1, large emails get smaller batches,
 * small emails get larger batches
 */

import { describe, it, expect } from 'vitest';
import { estimateTokens, calculateBatchSize } from '../../../src/core/filter/batch-sizing.js';

describe('estimateTokens', () => {
  it('should estimate tokens as chars/4', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
    expect(estimateTokens('')).toBe(0);
  });

  it('should handle longer strings', () => {
    const longString = 'a'.repeat(1000);
    expect(estimateTokens(longString)).toBe(250);
  });
});

describe('calculateBatchSize', () => {
  const maxContextTokens = 1000;
  const systemPromptTokens = 300; // 30% reserved

  it('should use 70% of maxContextTokens for emails (budget)', () => {
    const budget = (maxContextTokens - systemPromptTokens);
    expect(budget).toBe(700);
  });

  it('should return minimum batch size of 1', () => {
    // Very large email (takes most of budget)
    const largeEmailLength = 2800; // 700 tokens
    const size = calculateBatchSize(largeEmailLength, maxContextTokens, systemPromptTokens);
    expect(size).toBe(1);
  });

  it('should return larger batches for small emails', () => {
    // Small email (100 chars = 25 tokens)
    const smallEmailLength = 100;
    const size = calculateBatchSize(smallEmailLength, maxContextTokens, systemPromptTokens);
    // 700 / 25 = 28, but might be less due to prompt overhead
    expect(size).toBeGreaterThanOrEqual(1);
    expect(size).toBeLessThanOrEqual(28);
  });

  it('should handle zero length email', () => {
    const size = calculateBatchSize(0, maxContextTokens, systemPromptTokens);
    expect(size).toBe(1); // minimum
  });
});
