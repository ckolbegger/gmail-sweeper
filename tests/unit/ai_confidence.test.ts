import { describe, expect, it } from 'vitest';

import { toConfidenceLevel } from '@/adapters/ai/provider.js';

describe('ai confidence mapping', () => {
  it('should map confidence thresholds to expected levels', () => {
    expect(toConfidenceLevel(0.8)).toBe('high');
    expect(toConfidenceLevel(0.75)).toBe('medium');
    expect(toConfidenceLevel(0.5)).toBe('medium');
    expect(toConfidenceLevel(0.49)).toBe('low');
  });

  it('should handle boundary values 0.0, 0.5, 0.8, and 1.0', () => {
    expect(toConfidenceLevel(0.0)).toBe('low');
    expect(toConfidenceLevel(0.5)).toBe('medium');
    expect(toConfidenceLevel(0.8)).toBe('high');
    expect(toConfidenceLevel(1.0)).toBe('high');
  });
});
