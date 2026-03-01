/**
 * Email Body Formatter Unit Tests
 *
 * Tests for email body formatting utilities including:
 * - Collapsing excessive blank lines
 * - Extracting link text from HTML
 * - URL shortening
 * - Replacing URLs with link text
 * - Full email body formatting pipeline
 * - Link position tracking (formatEmailBodyWithLinks)
 */

import { describe, it, expect } from 'vitest';
import {
  collapseBlankLines,
  extractLinksFromHtml,
  shortenUrl,
  replaceUrlsWithLinkText,
  formatEmailBody,
  formatEmailBodyWithLinks,
  LinkSegment,
  FormattedEmailBody,
} from '../../../../src/cli/utils/email-body-formatter.js';

// ============================================================================
// collapseBlankLines Tests
// ============================================================================

describe('collapseBlankLines', () => {
  it('should collapse 3 consecutive newlines to 2', () => {
    const input = 'Line1\n\n\nLine2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line1\n\nLine2');
  });

  it('should collapse 5+ consecutive newlines to 2', () => {
    const input = 'Line1\n\n\n\n\nLine2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line1\n\nLine2');
  });

  it('should preserve 1 newline as-is', () => {
    const input = 'Line1\nLine2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line1\nLine2');
  });

  it('should preserve 2 newlines as-is', () => {
    const input = 'Line1\n\nLine2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line1\n\nLine2');
  });

  it('should handle empty string', () => {
    const input = '';
    const result = collapseBlankLines(input);
    expect(result).toBe('');
  });

  it('should handle text with no newlines', () => {
    const input = 'This is a single line of text without any newlines';
    const result = collapseBlankLines(input);
    expect(result).toBe('This is a single line of text without any newlines');
  });

  it('should handle mixed content: Line1\n\n\n\nLine2 → Line1\n\nLine2', () => {
    const input = 'Line1\n\n\n\nLine2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line1\n\nLine2');
  });

  it('should collapse multiple excessive blank line sequences throughout text', () => {
    const input = 'Para1\n\n\n\nPara2\n\n\n\n\nPara3';
    const result = collapseBlankLines(input);
    expect(result).toBe('Para1\n\nPara2\n\nPara3');
  });

  it('should handle text with only newlines', () => {
    const input = '\n\n\n\n\n';
    const result = collapseBlankLines(input);
    expect(result).toBe('\n\n');
  });

  it('should handle text starting with multiple newlines', () => {
    const input = '\n\n\nLine1';
    const result = collapseBlankLines(input);
    expect(result).toBe('\n\nLine1');
  });

  it('should handle text ending with multiple newlines', () => {
    const input = 'Line1\n\n\n';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line1\n\n');
  });
});

// ============================================================================
// extractLinksFromHtml Tests
// ============================================================================

describe('extractLinksFromHtml', () => {
  it('should extract single link from HTML anchor tag', () => {
    const html = '<a href="https://example.com">Click here</a>';
    const result = extractLinksFromHtml(html);
    expect(result.get('https://example.com')).toBe('Click here');
  });

  it('should extract multiple links from HTML', () => {
    const html = `
      <a href="https://example.com">Example</a>
      <a href="https://test.com">Test Site</a>
      <a href="https://github.com">GitHub</a>
    `;
    const result = extractLinksFromHtml(html);
    expect(result.get('https://example.com')).toBe('Example');
    expect(result.get('https://test.com')).toBe('Test Site');
    expect(result.get('https://github.com')).toBe('GitHub');
    expect(result.size).toBe(3);
  });

  it('should handle link with nested HTML tags', () => {
    const html = '<a href="https://example.com"><b>Bold</b> Text</a>';
    const result = extractLinksFromHtml(html);
    expect(result.get('https://example.com')).toBe('Bold Text');
  });

  it('should handle link with empty href', () => {
    const html = '<a href="">Empty Link</a>';
    const result = extractLinksFromHtml(html);
    expect(result.get('')).toBe('Empty Link');
  });

  it('should handle malformed HTML gracefully', () => {
    const html = '<a href="https://example.com">Unclosed tag';
    const result = extractLinksFromHtml(html);
    expect(result.get('https://example.com')).toBe('Unclosed tag');
  });

  it('should return empty Map for non-HTML input', () => {
    const html = 'This is plain text without any HTML';
    const result = extractLinksFromHtml(html);
    expect(result.size).toBe(0);
  });

  it('should return empty Map for empty string', () => {
    const html = '';
    const result = extractLinksFromHtml(html);
    expect(result.size).toBe(0);
  });

  it('should handle links with special characters in href', () => {
    const html = '<a href="https://example.com/path?query=1&other=2">Special URL</a>';
    const result = extractLinksFromHtml(html);
    expect(result.get('https://example.com/path?query=1&other=2')).toBe('Special URL');
  });

  it('should handle duplicate URLs (last one wins)', () => {
    const html = `
      <a href="https://example.com">First</a>
      <a href="https://example.com">Second</a>
    `;
    const result = extractLinksFromHtml(html);
    expect(result.get('https://example.com')).toBe('Second');
    expect(result.size).toBe(1);
  });

  it('should handle links with only whitespace text content', () => {
    const html = '<a href="https://example.com">   </a>';
    const result = extractLinksFromHtml(html);
    expect(result.get('https://example.com')).toBe('');
  });
});

// ============================================================================
// shortenUrl Tests
// ============================================================================

describe('shortenUrl', () => {
  it('should return unchanged URL (minus protocol) when within limit', () => {
    const url = 'https://example.com/path';
    const result = shortenUrl(url, 30);
    expect(result).toBe('example.com/path');
  });

  it('should shorten long URL to domain.com/.../last-segment format', () => {
    const url = 'https://example.com/very/long/path/to/resource/final';
    const result = shortenUrl(url, 30);
    expect(result).toContain('...');
    expect(result).toContain('final');
    expect(result.length).toBeLessThanOrEqual(30);
  });

  it('should handle URLs with query parameters', () => {
    const url = 'https://example.com/path?query=1&other=value';
    const result = shortenUrl(url, 40);
    expect(result).toContain('example.com');
    expect(result.length).toBeLessThanOrEqual(40);
  });

  it('should handle URLs with fragments', () => {
    const url = 'https://example.com/path#section-1';
    const result = shortenUrl(url, 30);
    expect(result).toContain('example.com');
  });

  it('should handle URLs without path (domain only)', () => {
    const url = 'https://example.com';
    const result = shortenUrl(url, 30);
    expect(result).toBe('example.com');
  });

  it('should handle URLs with trailing slash', () => {
    const url = 'https://example.com/';
    const result = shortenUrl(url, 30);
    expect(result).toBe('example.com');
  });

  it('should preserve last path segment when shortening', () => {
    const url = 'https://example.com/a/b/c/d/e/f/document.pdf';
    const result = shortenUrl(url, 35);
    expect(result).toContain('document.pdf');
  });

  it('should handle very short max length by returning truncated domain', () => {
    const url = 'https://example.com/path';
    const result = shortenUrl(url, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should handle http protocol removal', () => {
    const url = 'http://example.com/path';
    const result = shortenUrl(url, 30);
    expect(result).toBe('example.com/path');
    expect(result).not.toContain('http://');
  });
});

// ============================================================================
// replaceUrlsWithLinkText Tests
// ============================================================================

describe('replaceUrlsWithLinkText', () => {
  it('should replace URL with link text from map', () => {
    const text = 'Visit https://example.com for more info';
    const linkMap = new Map([['https://example.com', 'Example Site']]);
    const result = replaceUrlsWithLinkText(text, linkMap, 50);
    expect(result).toBe('Visit Example Site for more info');
  });

  it('should shorten URL not found in map', () => {
    const text = 'Visit https://unknown-site.com/very/long/path for more';
    const linkMap = new Map();
    const result = replaceUrlsWithLinkText(text, linkMap, 25);
    expect(result).toContain('...');
    expect(result).not.toContain('https://');
  });

  it('should truncate long link text with ...', () => {
    const text = 'Visit https://example.com';
    const longText = 'This is a very long link text that exceeds the limit';
    const linkMap = new Map([['https://example.com', longText]]);
    const result = replaceUrlsWithLinkText(text, linkMap, 20);
    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(20 + 'Visit '.length);
  });

  it('should handle multiple URLs in same text', () => {
    const text = 'Visit https://example.com and https://test.com today';
    const linkMap = new Map([
      ['https://example.com', 'Example'],
      ['https://test.com', 'Test'],
    ]);
    const result = replaceUrlsWithLinkText(text, linkMap, 50);
    expect(result).toBe('Visit Example and Test today');
  });

  it('should handle no URLs found in text', () => {
    const text = 'This is plain text without any URLs';
    const linkMap = new Map([['https://example.com', 'Example']]);
    const result = replaceUrlsWithLinkText(text, linkMap, 50);
    expect(result).toBe('This is plain text without any URLs');
  });

  it('should handle URL at start of text', () => {
    const text = 'https://example.com is a great site';
    const linkMap = new Map([['https://example.com', 'Example']]);
    const result = replaceUrlsWithLinkText(text, linkMap, 50);
    expect(result).toBe('Example is a great site');
  });

  it('should handle URL at end of text', () => {
    const text = 'Check out https://example.com';
    const linkMap = new Map([['https://example.com', 'Example']]);
    const result = replaceUrlsWithLinkText(text, linkMap, 50);
    expect(result).toBe('Check out Example');
  });

  it('should handle URL with no link text (empty string)', () => {
    const text = 'Visit https://example.com now';
    const linkMap = new Map([['https://example.com', '']]);
    const result = replaceUrlsWithLinkText(text, linkMap, 50);
    expect(result).toBe('Visit  now');
  });

  it('should handle mixed known and unknown URLs', () => {
    const text = 'Visit https://example.com or https://unknown.com/page';
    const linkMap = new Map([['https://example.com', 'Example']]);
    const result = replaceUrlsWithLinkText(text, linkMap, 50);
    expect(result).toContain('Example');
    expect(result).not.toContain('https://example.com');
    expect(result).not.toContain('https://unknown.com/page');
  });
});

// ============================================================================
// formatEmailBody Tests (Integration)
// ============================================================================

describe('formatEmailBody', () => {
  it('should format text-only body: applies blank line collapse + URL shortening', () => {
    const textBody = 'Hello\n\n\n\nVisit https://example.com/very/long/path/to/resource for more info';
    const result = formatEmailBody(textBody, { maxWidth: 50 });
    expect(result).toContain('Hello\n\n');
    expect(result).not.toContain('\n\n\n\n');
    expect(result).not.toContain('https://example.com/very/long/path/to/resource');
  });

  it('should format with HTML body: uses link text from HTML', () => {
    const textBody = 'Visit https://example.com for details';
    const htmlBody = '<a href="https://example.com">Our Website</a>';
    const result = formatEmailBody(textBody, { 
      maxWidth: 50, 
      htmlBody 
    });
    expect(result).toContain('Our Website');
    expect(result).not.toContain('https://example.com');
  });

  it('should combine formatting: blank lines + URL replacement', () => {
    const textBody = 'Hello\n\n\n\nCheck https://example.com and https://test.com';
    const htmlBody = `
      <a href="https://example.com">Example Site</a>
      <a href="https://test.com">Test Site</a>
    `;
    const result = formatEmailBody(textBody, { 
      maxWidth: 60, 
      htmlBody 
    });
    expect(result).toContain('Hello\n\n');
    expect(result).toContain('Example Site');
    expect(result).toContain('Test Site');
    expect(result).not.toContain('https://example.com');
    expect(result).not.toContain('https://test.com');
  });

  it('should handle edge case: empty body', () => {
    const result = formatEmailBody('', { maxWidth: 50 });
    expect(result).toBe('');
  });

  it('should handle body with only whitespace', () => {
    const result = formatEmailBody('   \n\n   ', { maxWidth: 50 });
    expect(result).toBe('   \n\n   ');
  });

  it('should handle body with only URLs and no HTML', () => {
    const textBody = 'https://example.com https://test.com';
    const result = formatEmailBody(textBody, { maxWidth: 50 });
    expect(result).not.toContain('https://example.com');
    expect(result).not.toContain('https://test.com');
  });

  it('should use maxLinkTextWidth option', () => {
    const textBody = 'Visit https://example.com today';
    const htmlBody = '<a href="https://example.com">Very Long Link Text Here That Is Definitely Over Ten Characters</a>';
    const result = formatEmailBody(textBody, { 
      maxWidth: 100, 
      maxLinkTextWidth: 10,
      htmlBody 
    });
    expect(result).toContain('...');
  });

  it('should preserve text structure when no URLs present', () => {
    const textBody = 'Paragraph 1\n\n\n\nParagraph 2\n\n\nParagraph 3';
    const result = formatEmailBody(textBody, { maxWidth: 50 });
    expect(result).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3');
  });

  it('should handle HTML with no anchor tags', () => {
    const textBody = 'Visit https://example.com';
    const htmlBody = '<div><p>Some content</p></div>';
    const result = formatEmailBody(textBody, { 
      maxWidth: 50, 
      htmlBody 
    });
    expect(result).not.toContain('https://example.com');
  });

  it('should handle complex mixed content', () => {
    const textBody = `
Hello there,



Please visit https://example.com/very/long/path for more information.
You can also check https://test.com.


Thanks!
    `.trim();
    const htmlBody = `
      <a href="https://example.com/very/long/path">Example Site</a>
      <a href="https://test.com">Test</a>
    `;
    const result = formatEmailBody(textBody, { 
      maxWidth: 60, 
      htmlBody 
    });
    expect(result).toContain('Hello there,');
    expect(result).toContain('\n\nPlease');
    expect(result).toContain('Example Site');
    expect(result).toContain('Test');
    expect(result).toContain('Thanks!');
  });
});

// ============================================================================
// formatEmailBodyWithLinks Tests (T001)
// ============================================================================

describe('formatEmailBodyWithLinks', () => {
  it('should return single link segment with correct position', () => {
    const textBody = 'Visit https://example.com today';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    expect(result.links).toHaveLength(1);
    expect(result.links[0].start).toBe(6); // After "Visit "
    expect(result.links[0].end).toBe(17);  // After "example.com" (11 chars)
    expect(result.links[0].text).toBe('example.com');
    expect(result.links[0].url).toBe('https://example.com');
    expect(result.text).toBe('Visit example.com today');
  });

  it('should return multiple links with correct non-overlapping positions', () => {
    const textBody = 'Visit https://example.com and https://test.com today';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    expect(result.links).toHaveLength(2);
    
    // First link: "example.com" (11 chars)
    expect(result.links[0].start).toBe(6);
    expect(result.links[0].end).toBe(17);
    expect(result.links[0].text).toBe('example.com');
    expect(result.links[0].url).toBe('https://example.com');
    
    // Second link: "test.com" (8 chars)
    // Position: "Visit example.com and " = 22 chars
    expect(result.links[1].start).toBe(22);
    expect(result.links[1].end).toBe(30);
    expect(result.links[1].text).toBe('test.com');
    expect(result.links[1].url).toBe('https://test.com');
    
    // Verify non-overlapping
    expect(result.links[0].end).toBeLessThanOrEqual(result.links[1].start);
    expect(result.text).toBe('Visit example.com and test.com today');
  });

  it('should account for blank line collapsing in link positions', () => {
    const textBody = 'Hello\n\n\n\nVisit https://example.com';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    // After collapsing: "Hello\n\nVisit https://example.com"
    // Position: "Hello\n\nVisit " = 5 + 2 + 6 = 13
    expect(result.links).toHaveLength(1);
    expect(result.links[0].start).toBe(13);
    expect(result.links[0].end).toBe(24); // 13 + 11 (example.com length)
    expect(result.links[0].text).toBe('example.com');
    expect(result.text).toBe('Hello\n\nVisit example.com');
  });

  it('should account for URL shortening in link positions', () => {
    const textBody = 'Visit https://example.com/very/long/path/to/resource';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    // Original URL is 52 chars, shortened should be shorter
    const link = result.links[0];
    expect(link.start).toBe(6);
    // End position should be start + length of shortened text
    expect(link.end).toBe(6 + link.text.length);
    expect(link.url).toBe('https://example.com/very/long/path/to/resource');
    // Text should be shortened version
    expect(link.text.length).toBeLessThan(50);
    expect(result.text).toContain(link.text);
    expect(result.text.indexOf(link.text)).toBe(link.start);
  });

  it('should account for link text from HTML (different length than URL)', () => {
    const textBody = 'Visit https://example.com for details';
    const htmlBody = '<a href="https://example.com">Our Amazing Website</a>';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50, htmlBody });
    
    expect(result.links).toHaveLength(1);
    expect(result.links[0].start).toBe(6);
    expect(result.links[0].end).toBe(25); // 6 + "Our Amazing Website".length (19)
    expect(result.links[0].text).toBe('Our Amazing Website');
    expect(result.links[0].url).toBe('https://example.com');
    expect(result.text).toBe('Visit Our Amazing Website for details');
  });

  it('should return empty links array when no URLs present', () => {
    const textBody = 'This is plain text without any URLs';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    expect(result.links).toEqual([]);
    expect(result.links).toHaveLength(0);
    expect(result.text).toBe('This is plain text without any URLs');
  });

  it('should account for truncated link text with ellipsis', () => {
    const textBody = 'Visit https://example.com today';
    const longLinkText = 'This is a very long link text that will be truncated';
    const htmlBody = `<a href="https://example.com">${longLinkText}</a>`;
    const result = formatEmailBodyWithLinks(textBody, { 
      maxWidth: 100, 
      maxLinkTextWidth: 20,
      htmlBody 
    });
    
    expect(result.links).toHaveLength(1);
    expect(result.links[0].start).toBe(6);
    // Text should be truncated with ...
    expect(result.links[0].text).toContain('...');
    expect(result.links[0].text.length).toBe(20);
    expect(result.links[0].end).toBe(26); // 6 + 20
    expect(result.links[0].url).toBe('https://example.com');
    expect(result.text).toBe(`Visit ${result.links[0].text} today`);
  });

  it('should handle link at the start of text', () => {
    const textBody = 'https://example.com is the site';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    expect(result.links).toHaveLength(1);
    expect(result.links[0].start).toBe(0);
    expect(result.links[0].end).toBe(11); // "example.com".length (11 chars)
    expect(result.links[0].text).toBe('example.com');
    expect(result.links[0].url).toBe('https://example.com');
  });

  it('should handle link at the end of text', () => {
    const textBody = 'Visit https://example.com';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    expect(result.links).toHaveLength(1);
    expect(result.links[0].start).toBe(6);
    expect(result.links[0].end).toBe(17); // 6 + 11 (example.com length)
    expect(result.links[0].text).toBe('example.com');
    expect(result.text).toBe('Visit example.com');
  });

  it('should handle multiple links with text between them', () => {
    const textBody = 'First https://a.com then some text then https://b.com end';
    const result = formatEmailBodyWithLinks(textBody, { maxWidth: 50 });
    
    expect(result.links).toHaveLength(2);
    
    // First link: "a.com" (5 chars)
    expect(result.links[0].start).toBe(6);
    expect(result.links[0].end).toBe(11);
    expect(result.links[0].text).toBe('a.com');
    
    // Second link: "b.com" (5 chars)
    // Position: "First a.com then some text then " = 6 + 5 + 21 = 32
    expect(result.links[1].start).toBe(32);
    expect(result.links[1].end).toBe(37);
    expect(result.links[1].text).toBe('b.com');
  });
});
