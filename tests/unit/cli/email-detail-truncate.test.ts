import { describe, expect, it } from 'vitest';
import { buildBodyViewport } from '../../../src/cli/components/email-detail.js';

describe('buildBodyViewport', () => {
  it('returns full lines when body has fewer lines than max', () => {
    const result = buildBodyViewport('line1\nline2', 3, 0, 40);

    expect(result.lines.slice(0, 2)).toEqual(['line1', 'line2']);
    expect(result.canScrollDown).toBe(false);
    expect(result.canScrollUp).toBe(false);
  });

  it('supports scrolling through long body content', () => {
    const result = buildBodyViewport('a\nb\nc\nd', 2, 1, 40);

    expect(result.lines.slice(0, 2)).toEqual(['b', 'c']);
    expect(result.canScrollUp).toBe(true);
    expect(result.canScrollDown).toBe(true);
  });

  it('wraps long lines to fit pane width', () => {
    const result = buildBodyViewport('abcdefghij', 3, 0, 7);

    expect(result.lines.slice(0, 3)).toEqual(['abcd', 'efgh', 'ij']);
    expect(result.totalLines).toBe(3);
  });

  it('strips carriage returns and control characters from body content', () => {
    const result = buildBodyViewport('abc\r\ndef\u0007ghi', 3, 0, 20);

    expect(result.lines[0]).toBe('abc');
    expect(result.lines[1]).toBe('defghi');
  });

  it('normalizes tabs so terminal tab stops do not split columns', () => {
    const result = buildBodyViewport('left\tright', 3, 0, 40);

    expect(result.lines[0]).toBe('left right');
  });
});
