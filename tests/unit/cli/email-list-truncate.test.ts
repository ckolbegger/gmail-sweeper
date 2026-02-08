import { describe, expect, it } from 'vitest';
import { toAscii, truncateDisplay } from '../../../src/cli/components/email-list.js';

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

describe('toAscii', () => {
  it('removes non-ascii characters from subject text', () => {
    expect(toAscii('⏳ Next-Gen KTM Unveiled 🏁')).toBe('Next-Gen KTM Unveiled ');
  });

  it('trims leading spaces after sanitizing', () => {
    expect(toAscii('   ⏳  50% Off Ends Sunday')).toBe('50% Off Ends Sunday');
  });
});
