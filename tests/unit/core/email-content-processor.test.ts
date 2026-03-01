/**
 * Unit tests for EmailContentProcessor
 */
import { describe, it, expect } from 'vitest';
import {
  type URLReference,
  type ProcessedBody,
  type ProcessOptions,
  collapseBlankLines,
  truncateUrl,
  detectUrls,
  process,
} from '../../../src/core/services/email-content-processor.js';

describe('EmailContentProcessor Types', () => {
  describe('URLReference', () => {
    it('should define URLReference interface with required fields', () => {
      const urlRef: URLReference = {
        fullUrl: 'https://example.com',
        displayText: 'example.com',
        startIndex: 0,
        endIndex: 19,
        isTruncated: false,
      };

      expect(urlRef.fullUrl).toBe('https://example.com');
      expect(urlRef.displayText).toBe('example.com');
      expect(urlRef.startIndex).toBe(0);
      expect(urlRef.endIndex).toBe(19);
      expect(urlRef.isTruncated).toBe(false);
    });

    it('should mark isTruncated true when URL is truncated', () => {
      const urlRef: URLReference = {
        fullUrl: 'https://very-long-url.com/path/to/something',
        displayText: 'https://very-l…/something',
        startIndex: 0,
        endIndex: 45,
        isTruncated: true,
      };

      expect(urlRef.isTruncated).toBe(true);
      expect(urlRef.displayText.length).toBeLessThan(urlRef.fullUrl.length);
    });
  });

  describe('ProcessedBody', () => {
    it('should define ProcessedBody interface with required fields', () => {
      const processed: ProcessedBody = {
        originalText: 'Original text',
        processedText: 'Processed text',
        urls: [],
        urlCount: 0,
      };

      expect(processed.originalText).toBe('Original text');
      expect(processed.processedText).toBe('Processed text');
      expect(processed.urls).toEqual([]);
      expect(processed.urlCount).toBe(0);
    });

    it('should include detected URLs in ProcessedBody', () => {
      const urlRef: URLReference = {
        fullUrl: 'https://example.com',
        displayText: 'https://example.com',
        startIndex: 0,
        endIndex: 19,
        isTruncated: false,
      };

      const processed: ProcessedBody = {
        originalText: 'https://example.com',
        processedText: 'https://example.com',
        urls: [urlRef],
        urlCount: 1,
      };

      expect(processed.urls).toHaveLength(1);
      expect(processed.urlCount).toBe(1);
    });
  });

  describe('ProcessOptions', () => {
    it('should define ProcessOptions with maxUrlWidth', () => {
      const options: ProcessOptions = {
        maxUrlWidth: 40,
      };

      expect(options.maxUrlWidth).toBe(40);
    });
  });
});

describe('collapseBlankLines', () => {
  it('should collapse 5+ consecutive blank lines to 2', () => {
    const input = 'Line 1\n\n\n\n\n\nLine 2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line 1\n\nLine 2');
  });

  it('should collapse exactly 3 blank lines to 2', () => {
    const input = 'Line 1\n\n\nLine 2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line 1\n\nLine 2');
  });

  it('should preserve exactly 2 blank lines', () => {
    const input = 'Line 1\n\nLine 2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line 1\n\nLine 2');
  });

  it('should preserve exactly 1 blank line', () => {
    const input = 'Line 1\nLine 2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line 1\nLine 2');
  });

  it('should preserve content with no blank lines', () => {
    const input = 'Line 1Line 2';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line 1Line 2');
  });

  it('should collapse multiple groups of blank lines independently', () => {
    const input = 'Line 1\n\n\n\n\nLine 2\n\n\n\n\n\n\nLine 3';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line 1\n\nLine 2\n\nLine 3');
  });

  it('should handle blank lines at start of text', () => {
    const input = '\n\n\n\n\nLine 1';
    const result = collapseBlankLines(input);
    expect(result).toBe('\n\nLine 1');
  });

  it('should handle blank lines at end of text', () => {
    const input = 'Line 1\n\n\n\n\n';
    const result = collapseBlankLines(input);
    expect(result).toBe('Line 1\n\n');
  });

  it('should handle empty string', () => {
    const input = '';
    const result = collapseBlankLines(input);
    expect(result).toBe('');
  });

  it('should handle string with only newlines', () => {
    const input = '\n\n\n\n\n';
    const result = collapseBlankLines(input);
    expect(result).toBe('\n\n');
  });
});

describe('truncateUrl', () => {
  it('should return short URL unchanged', () => {
    const url = 'https://example.com';
    const result = truncateUrl(url, 40);
    expect(result).toBe('https://example.com');
  });

  it('should truncate long URL with ellipsis in middle', () => {
    const url = 'https://very-long-domain-name.com/path/to/some/resource';
    const result = truncateUrl(url, 30);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result).toContain('…');
  });

  it('should preserve domain portion when truncating', () => {
    const url = 'https://example.com/very/long/path/to/resource';
    const result = truncateUrl(url, 25);
    // Should preserve scheme and start of domain
    expect(result).toMatch(/^https:\/\//);
    expect(result).toContain('…');
  });

  it('should handle URL with Unicode characters', () => {
    const url = 'https://例え.jp/パス';
    const result = truncateUrl(url, 20);
    // Unicode chars have display width 2, so result should fit
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('should handle URL shorter than max width', () => {
    const url = 'https://a.co';
    const result = truncateUrl(url, 50);
    expect(result).toBe('https://a.co');
    expect(result).not.toContain('…');
  });

  it('should handle very small max width', () => {
    const url = 'https://example.com';
    const result = truncateUrl(url, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe('detectUrls', () => {
  it('should detect single https URL', () => {
    const text = 'Visit https://example.com for more info';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(1);
    expect(urls[0].fullUrl).toBe('https://example.com');
  });

  it('should detect single http URL', () => {
    const text = 'Visit http://example.com for more info';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(1);
    expect(urls[0].fullUrl).toBe('http://example.com');
  });

  it('should detect www URL without scheme', () => {
    const text = 'Visit www.example.com for more info';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(1);
    expect(urls[0].fullUrl).toBe('www.example.com');
  });

  it('should detect multiple URLs', () => {
    const text = 'Check https://foo.com and https://bar.com';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(2);
    expect(urls[0].fullUrl).toBe('https://foo.com');
    expect(urls[1].fullUrl).toBe('https://bar.com');
  });

  it('should not detect email addresses as URLs', () => {
    const text = 'Contact user@example.com for help';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(0);
  });

  it('should not detect version numbers as URLs', () => {
    const text = 'Version 1.2.3 is available';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(0);
  });

  it('should handle URLs with special characters', () => {
    const text = 'Visit https://example.com/path?query=value&other=123';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(1);
    expect(urls[0].fullUrl).toContain('?query=value');
  });

  it('should handle multiple URLs on same line', () => {
    const text = 'Links: https://a.com https://b.com https://c.com';
    const urls = detectUrls(text, 50);
    expect(urls).toHaveLength(3);
  });

  it('should truncate display text when URL exceeds max width', () => {
    const text = 'Visit https://very-long-domain-name.com/path/to/resource';
    const urls = detectUrls(text, 20);
    expect(urls).toHaveLength(1);
    expect(urls[0].isTruncated).toBe(true);
    expect(urls[0].displayText.length).toBeLessThanOrEqual(20);
  });

  it('should set correct start and end indices', () => {
    const text = 'Visit https://example.com now';
    const urls = detectUrls(text, 50);
    expect(urls[0].startIndex).toBe(6);
    expect(urls[0].endIndex).toBe(25);
  });
});

describe('process', () => {
  it('should process body with blank lines only', () => {
    const body = 'Line 1\n\n\n\n\nLine 2';
    const options: ProcessOptions = { maxUrlWidth: 40 };
    const result = process(body, options);

    expect(result.processedText).toBe('Line 1\n\nLine 2');
    expect(result.originalText).toBe(body);
    expect(result.urlCount).toBe(0);
  });

  it('should process body with URLs only', () => {
    const body = 'Visit https://example.com';
    const options: ProcessOptions = { maxUrlWidth: 40 };
    const result = process(body, options);

    expect(result.urls).toHaveLength(1);
    expect(result.urlCount).toBe(1);
  });

  it('should process body with both blank lines and URLs', () => {
    const body = 'Line 1\n\n\n\n\nVisit https://example.com\n\n\n\n\nLine 2';
    const options: ProcessOptions = { maxUrlWidth: 40 };
    const result = process(body, options);

    expect(result.processedText).toBe('Line 1\n\nVisit https://example.com\n\nLine 2');
    expect(result.urls).toHaveLength(1);
  });

  it('should preserve original text', () => {
    const body = 'Original content';
    const options: ProcessOptions = { maxUrlWidth: 40 };
    const result = process(body, options);

    expect(result.originalText).toBe(body);
  });

  it('should handle empty body', () => {
    const body = '';
    const options: ProcessOptions = { maxUrlWidth: 40 };
    const result = process(body, options);

    expect(result.processedText).toBe('');
    expect(result.urls).toHaveLength(0);
  });
});
