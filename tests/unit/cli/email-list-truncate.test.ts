import { describe, expect, it } from 'vitest';
import { truncateDisplay } from '../../../src/cli/components/email-list.js';

describe('truncateDisplay', () => {
  it('keeps short text unchanged', () => {
    expect(truncateDisplay('hello', 10)).toBe('hello');
  });

  it('truncates long ascii text with ellipsis', () => {
    expect(truncateDisplay('abcdefghijkl', 6)).toBe('abcde…');
  });

  it('handles emoji width to avoid wrapping overflow', () => {
    expect(truncateDisplay('⏳ 50% Off Ends Sunday, Vibe Eng Resume', 12)).toBe('⏳ 50% Off…');
  });
});
