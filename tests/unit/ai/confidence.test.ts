/**
 * T007: Unit tests for toConfidenceLevel() mapping.
 *
 * Thresholds: ≥0.8→high, ≥0.5→medium, <0.5→low
 * Boundary values: 0.0, 0.5, 0.8, 1.0
 */

import { describe, it, expect } from 'vitest';
import { toConfidenceLevel } from '../../../src/core/ai/provider.js';

describe('toConfidenceLevel', () => {
  describe('high confidence (≥0.8)', () => {
    it('should return high for 0.8 (boundary)', () => {
      expect(toConfidenceLevel(0.8)).toBe('high');
    });

    it('should return high for 1.0 (max)', () => {
      expect(toConfidenceLevel(1.0)).toBe('high');
    });

    it('should return high for 0.95', () => {
      expect(toConfidenceLevel(0.95)).toBe('high');
    });
  });

  describe('medium confidence (≥0.5, <0.8)', () => {
    it('should return medium for 0.5 (boundary)', () => {
      expect(toConfidenceLevel(0.5)).toBe('medium');
    });

    it('should return medium for 0.79 (just below high)', () => {
      expect(toConfidenceLevel(0.79)).toBe('medium');
    });

    it('should return medium for 0.65', () => {
      expect(toConfidenceLevel(0.65)).toBe('medium');
    });
  });

  describe('low confidence (<0.5)', () => {
    it('should return low for 0.0 (min)', () => {
      expect(toConfidenceLevel(0.0)).toBe('low');
    });

    it('should return low for 0.49 (just below medium)', () => {
      expect(toConfidenceLevel(0.49)).toBe('low');
    });

    it('should return low for 0.25', () => {
      expect(toConfidenceLevel(0.25)).toBe('low');
    });
  });
});
