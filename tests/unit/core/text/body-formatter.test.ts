import { describe, it, expect } from 'vitest';
import { collapseBlankLines, truncateWithEllipsis, processEmailBody } from '../../../../src/core/text/body-formatter.js';

describe('body-formatter', () => {
  describe('collapseBlankLines', () => {
    it('collapses 3 consecutive blank lines to exactly 2', () => {
      const result = collapseBlankLines(['a', '', '', '', 'b']);
      expect(result).toEqual(['a', '', '', 'b']);
    });

    it('collapses 5 consecutive blank lines to exactly 2', () => {
      const result = collapseBlankLines(['a', '', '', '', '', '', 'b']);
      expect(result).toEqual(['a', '', '', 'b']);
    });

    it('collapses whitespace-only lines as blank', () => {
      const result = collapseBlankLines(['a', '', '  ', '\t', '', 'b']);
      // 5 blank/whitespace lines collapsed to 2; original content preserved
      expect(result).toHaveLength(4);
      expect(result[0]).toBe('a');
      expect(result[1]!.trim()).toBe('');
      expect(result[2]!.trim()).toBe('');
      expect(result[3]).toBe('b');
    });

    it('preserves exactly 1 consecutive blank line', () => {
      const input = ['a', '', 'b'];
      expect(collapseBlankLines(input)).toEqual(['a', '', 'b']);
    });

    it('preserves exactly 2 consecutive blank lines', () => {
      const input = ['a', '', '', 'b'];
      expect(collapseBlankLines(input)).toEqual(['a', '', '', 'b']);
    });

    it('preserves content with no blank lines', () => {
      const input = ['a', 'b', 'c'];
      expect(collapseBlankLines(input)).toEqual(['a', 'b', 'c']);
    });

    it('handles blank lines at the start of the array', () => {
      const result = collapseBlankLines(['', '', '', 'a']);
      expect(result).toEqual(['', '', 'a']);
    });

    it('handles blank lines at the end of the array', () => {
      const result = collapseBlankLines(['a', '', '', '']);
      expect(result).toEqual(['a', '', '']);
    });

    it('handles empty array', () => {
      expect(collapseBlankLines([])).toEqual([]);
    });

    it('handles array of only blank lines', () => {
      const result = collapseBlankLines(['', '', '', '', '']);
      expect(result).toEqual(['', '']);
    });
  });

  describe('truncateWithEllipsis', () => {
    it('returns string unchanged when shorter than maxLength', () => {
      expect(truncateWithEllipsis('hello', 10)).toBe('hello');
    });

    it('returns string unchanged when exactly at maxLength', () => {
      expect(truncateWithEllipsis('hello', 5)).toBe('hello');
    });

    it('truncates and appends ellipsis when longer than maxLength', () => {
      const result = truncateWithEllipsis('hello world', 8);
      expect(result).toHaveLength(8);
      expect(result).toBe('hello w…');
    });

    it('result length is exactly maxLength when truncated', () => {
      const result = truncateWithEllipsis('abcdefghij', 6);
      expect(result).toHaveLength(6);
      expect(result.endsWith('…')).toBe(true);
    });

    it('handles maxLength of 1 by returning just ellipsis', () => {
      expect(truncateWithEllipsis('hello', 1)).toBe('…');
    });

    it('returns empty string unchanged', () => {
      expect(truncateWithEllipsis('', 5)).toBe('');
    });

    it('uses single Unicode ellipsis character (not three dots)', () => {
      const result = truncateWithEllipsis('abcde', 3);
      expect(result).toBe('ab…');
      expect(result).toHaveLength(3);
    });
  });

  describe('processEmailBody — HTML path', () => {
    const paneWidth = 80;
    const halfWidth = Math.floor(paneWidth / 2); // 40

    it('extracts link text and fullUrl from a simple anchor', () => {
      const result = processEmailBody('<a href="https://example.com">Link text</a>', true, paneWidth);
      expect(result.allLinks).toHaveLength(1);
      expect(result.allLinks[0]!.displayText).toBe('Link text');
      expect(result.allLinks[0]!.fullUrl).toBe('https://example.com');
    });

    it('truncates link text longer than half paneWidth', () => {
      const longText = 'A'.repeat(halfWidth + 10);
      const result = processEmailBody(`<a href="https://example.com">${longText}</a>`, true, paneWidth);
      expect(result.allLinks[0]!.displayText.length).toBeLessThanOrEqual(halfWidth);
      expect(result.allLinks[0]!.displayText.endsWith('…')).toBe(true);
    });

    it('falls back to truncated URL when link text is empty', () => {
      const result = processEmailBody('<a href="https://example.com"></a>', true, paneWidth);
      expect(result.allLinks[0]!.displayText).toContain('example.com');
      expect(result.allLinks[0]!.fullUrl).toBe('https://example.com');
    });

    it('falls back to truncated URL when link text is only whitespace', () => {
      const result = processEmailBody('<a href="https://example.com">   </a>', true, paneWidth);
      expect(result.allLinks[0]!.displayText).toContain('example.com');
    });

    it('extracts multiple anchors in document order', () => {
      const html = '<a href="https://first.com">First</a> and <a href="https://second.com">Second</a>';
      const result = processEmailBody(html, true, paneWidth);
      expect(result.allLinks).toHaveLength(2);
      expect(result.allLinks[0]!.fullUrl).toBe('https://first.com');
      expect(result.allLinks[1]!.fullUrl).toBe('https://second.com');
    });

    it('returns empty allLinks for HTML with no anchors', () => {
      const result = processEmailBody('<p>Hello world</p>', true, paneWidth);
      expect(result.allLinks).toEqual([]);
    });

    it('applies collapseBlankLines: 5 blank lines become 2', () => {
      const html = 'Before\n\n\n\n\nAfter';
      const result = processEmailBody(html, true, paneWidth);
      let maxConsecutiveBlanks = 0;
      let current = 0;
      for (const line of result.lines) {
        if (line.text.trim() === '') {
          current++;
          maxConsecutiveBlanks = Math.max(maxConsecutiveBlanks, current);
        } else {
          current = 0;
        }
      }
      expect(maxConsecutiveBlanks).toBeLessThanOrEqual(2);
    });

    it('sets lineIndex to the index of the ProcessedLine containing the link', () => {
      const html = 'Line0\n<a href="https://example.com">Click</a>\nLine2';
      const result = processEmailBody(html, true, paneWidth);
      const link = result.allLinks[0]!;
      expect(result.lines[link.lineIndex]!.text).toContain('Click');
    });

    it('allLinks[i].index equals i', () => {
      const html = '<a href="https://a.com">A</a> <a href="https://b.com">B</a>';
      const result = processEmailBody(html, true, paneWidth);
      expect(result.allLinks[0]!.index).toBe(0);
      expect(result.allLinks[1]!.index).toBe(1);
    });
  });

  describe('processEmailBody — plain-text path', () => {
    const paneWidth = 80;
    const halfWidth = Math.floor(paneWidth / 2); // 40

    it('leaves short https:// URL unchanged in display', () => {
      const url = 'https://short.io';
      const result = processEmailBody(`Visit ${url}`, false, paneWidth);
      expect(result.allLinks[0]!.displayText).toBe(url);
      expect(result.allLinks[0]!.fullUrl).toBe(url);
    });

    it('truncates long https:// URL and preserves fullUrl', () => {
      const url = 'https://example.com/' + 'a'.repeat(200);
      const result = processEmailBody(url, false, paneWidth);
      expect(result.allLinks[0]!.displayText.length).toBeLessThanOrEqual(halfWidth);
      expect(result.allLinks[0]!.displayText.endsWith('…')).toBe(true);
      expect(result.allLinks[0]!.fullUrl).toBe(url);
    });

    it('detects http:// URLs', () => {
      const result = processEmailBody('http://example.com', false, paneWidth);
      expect(result.allLinks).toHaveLength(1);
      expect(result.allLinks[0]!.fullUrl).toBe('http://example.com');
    });

    it('detects multiple bare URLs in document order', () => {
      const body = 'See https://first.com and https://second.com';
      const result = processEmailBody(body, false, paneWidth);
      expect(result.allLinks).toHaveLength(2);
      expect(result.allLinks[0]!.fullUrl).toBe('https://first.com');
      expect(result.allLinks[1]!.fullUrl).toBe('https://second.com');
    });

    it('returns empty allLinks for plain text with no URLs', () => {
      const result = processEmailBody('Hello world, no URLs here.', false, paneWidth);
      expect(result.allLinks).toEqual([]);
    });

    it('detects mailto: URLs', () => {
      const result = processEmailBody('Contact mailto:user@example.com for help', false, paneWidth);
      expect(result.allLinks).toHaveLength(1);
      expect(result.allLinks[0]!.fullUrl).toBe('mailto:user@example.com');
    });

    it('treats isHtml=false as plain-text even for anchor-looking text', () => {
      const body = '<a href="https://example.com">Link</a>';
      const result = processEmailBody(body, false, paneWidth);
      // No anchor extraction — URL in href is NOT extracted as a LinkInfo with link text
      // The raw text may still be searched for bare URLs, but anchors not parsed
      expect(result.allLinks.every(l => l.displayText !== 'Link')).toBe(true);
    });

    it('applies collapseBlankLines on plain-text path', () => {
      const body = 'Before\n\n\n\n\nAfter';
      const result = processEmailBody(body, false, paneWidth);
      let maxConsecutiveBlanks = 0;
      let current = 0;
      for (const line of result.lines) {
        if (line.text.trim() === '') {
          current++;
          maxConsecutiveBlanks = Math.max(maxConsecutiveBlanks, current);
        } else {
          current = 0;
        }
      }
      expect(maxConsecutiveBlanks).toBeLessThanOrEqual(2);
    });

    it('plain line with no URLs has links === []', () => {
      const result = processEmailBody('Just plain text here.', false, paneWidth);
      expect(result.lines[0]!.links).toEqual([]);
    });
  });
});
