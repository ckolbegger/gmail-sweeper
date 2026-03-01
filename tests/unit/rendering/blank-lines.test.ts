import { describe, it, expect } from 'vitest';
import { collapseBlankLines } from '../../../src/core/rendering/blank-lines.js';

describe('collapseBlankLines', () => {
  it('should collapse 3 consecutive blank lines to 2', () => {
    const input = 'line1\n\n\nline2';
    const result = collapseBlankLines(input);
    expect(result).toBe('line1\n\nline2');
  });

  it('should collapse 5 consecutive blank lines to 2', () => {
    const input = 'line1\n\n\n\n\nline2';
    const result = collapseBlankLines(input);
    expect(result).toBe('line1\n\nline2');
  });

  it('should collapse 10+ consecutive blank lines to 2', () => {
    const input = 'line1\n\n\n\n\n\n\n\n\n\nline2';
    const result = collapseBlankLines(input);
    expect(result).toBe('line1\n\nline2');
  });

  it('should preserve single blank line between paragraphs', () => {
    const input = 'line1\n\nline2';
    const result = collapseBlankLines(input);
    expect(result).toBe('line1\n\nline2');
  });

  it('should handle text with no blank lines', () => {
    const input = 'line1\nline2\nline3';
    const result = collapseBlankLines(input);
    expect(result).toBe('line1\nline2\nline3');
  });

  it('should handle blank lines at start', () => {
    const input = '\n\n\nline1';
    const result = collapseBlankLines(input);
    expect(result).toBe('\n\nline1');
  });

  it('should handle blank lines at end', () => {
    const input = 'line1\n\n\n';
    const result = collapseBlankLines(input);
    expect(result).toBe('line1\n\n');
  });

  it('should handle empty string', () => {
    const input = '';
    const result = collapseBlankLines(input);
    expect(result).toBe('');
  });
});
