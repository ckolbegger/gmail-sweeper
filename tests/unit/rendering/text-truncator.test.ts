import { describe, it, expect } from 'vitest';
import {
  calculateDisplayText,
  truncateToWidth,
} from '../../../src/core/rendering/text-truncator.js';

describe('truncateToWidth', () => {
  it('should not truncate string shorter than max width', () => {
    expect(truncateToWidth('hello', 10)).toBe('hello');
  });

  it('should truncate string longer than max width', () => {
    expect(truncateToWidth('hello world', 8)).toBe('hello...');
  });

  it('should handle exact width', () => {
    expect(truncateToWidth('hello', 5)).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(truncateToWidth('', 10)).toBe('');
  });
});

describe('calculateDisplayText', () => {
  it('should return full URL when under 50% width', () => {
    const url = 'https://example.com';
    expect(calculateDisplayText(url, 80)).toBe('https://example.com');
  });

  it('should truncate URL when over 50% width', () => {
    const url = 'https://example.com/some/very/long/path';
    expect(calculateDisplayText(url, 40)).toContain('...');
  });

  it('should use domain as base for truncation', () => {
    const url = 'https://example.com/very/long/path';
    const result = calculateDisplayText(url, 20);
    expect(result).toContain('...');
  });
});
