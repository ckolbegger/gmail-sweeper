import { describe, it, expect } from 'vitest';
import { toConfidenceLevel } from '../../../../src/services/ai/provider';

describe('toConfidenceLevel', () => {
  it('should map scores >= 0.8 to high', () => {
    expect(toConfidenceLevel(0.8)).toBe('high');
    expect(toConfidenceLevel(0.95)).toBe('high');
    expect(toConfidenceLevel(1.0)).toBe('high');
  });

  it('should map scores >= 0.5 and < 0.8 to medium', () => {
    expect(toConfidenceLevel(0.5)).toBe('medium');
    expect(toConfidenceLevel(0.79)).toBe('medium');
  });

  it('should map scores < 0.5 to low', () => {
    expect(toConfidenceLevel(0.49)).toBe('low');
    expect(toConfidenceLevel(0.1)).toBe('low');
    expect(toConfidenceLevel(0.0)).toBe('low');
  });
});
