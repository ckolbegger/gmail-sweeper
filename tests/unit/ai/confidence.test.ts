import { describe, it, expect } from 'vitest';
import { toConfidenceLevel } from '../../../src/core/ai/provider.js';

describe('toConfidenceLevel', () => {
  it('should return "high" for confidence >= 0.8', () => {
    expect(toConfidenceLevel(0.8)).toBe('high');
    expect(toConfidenceLevel(0.85)).toBe('high');
    expect(toConfidenceLevel(0.9)).toBe('high');
    expect(toConfidenceLevel(1.0)).toBe('high');
  });

  it('should return "medium" for confidence >= 0.5 and < 0.8', () => {
    expect(toConfidenceLevel(0.5)).toBe('medium');
    expect(toConfidenceLevel(0.6)).toBe('medium');
    expect(toConfidenceLevel(0.79)).toBe('medium');
  });

  it('should return "low" for confidence < 0.5', () => {
    expect(toConfidenceLevel(0.49)).toBe('low');
    expect(toConfidenceLevel(0.3)).toBe('low');
    expect(toConfidenceLevel(0.1)).toBe('low');
    expect(toConfidenceLevel(0.0)).toBe('low');
  });

  it('should handle boundary values correctly', () => {
    expect(toConfidenceLevel(0.0)).toBe('low');
    expect(toConfidenceLevel(0.5)).toBe('medium');
    expect(toConfidenceLevel(0.8)).toBe('high');
    expect(toConfidenceLevel(1.0)).toBe('high');
  });
});
