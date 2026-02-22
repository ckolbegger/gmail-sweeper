import { describe, it, expect } from 'vitest';
import { toConfidenceLevel } from '@/core/ai/provider.js';

describe('toConfidenceLevel', () => {
  describe('high confidence', () => {
    it('should return "high" for confidence >= 0.8', () => {
      expect(toConfidenceLevel(0.8)).toBe('high');
      expect(toConfidenceLevel(0.9)).toBe('high');
      expect(toConfidenceLevel(1.0)).toBe('high');
    });
  });

  describe('medium confidence', () => {
    it('should return "medium" for confidence >= 0.5 and < 0.8', () => {
      expect(toConfidenceLevel(0.5)).toBe('medium');
      expect(toConfidenceLevel(0.7)).toBe('medium');
      expect(toConfidenceLevel(0.79)).toBe('medium');
    });
  });

  describe('low confidence', () => {
    it('should return "low" for confidence < 0.5', () => {
      expect(toConfidenceLevel(0.4)).toBe('low');
      expect(toConfidenceLevel(0.0)).toBe('low');
      expect(toConfidenceLevel(0.49)).toBe('low');
    });
  });

  describe('boundary values', () => {
    it('should handle exact boundary 0.5', () => {
      expect(toConfidenceLevel(0.5)).toBe('medium');
    });

    it('should handle exact boundary 0.8', () => {
      expect(toConfidenceLevel(0.8)).toBe('high');
    });
  });
});
