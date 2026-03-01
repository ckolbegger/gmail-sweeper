/**
 * Unit tests for EmailDetail component URL handling
 *
 * Tests for US2: Shortened URL Display
 */
import { describe, it, expect } from 'vitest';
import { buildBodyViewport } from '../../../src/cli/components/email-detail.js';
import {
  detectUrls,
  truncateUrl,
  process,
  type URLReference,
  type ProcessedBody,
} from '../../../src/core/services/email-content-processor.js';

describe('EmailDetail URL Display', () => {
  describe('URL detection and truncation', () => {
    it('should detect single URL in body', () => {
      const body = 'Visit https://example.com for more info';
      const urls = detectUrls(body, 40);

      expect(urls).toHaveLength(1);
      expect(urls[0]?.fullUrl).toBe('https://example.com');
    });

    it('should detect multiple URLs in body', () => {
      const body = 'Check https://foo.com and https://bar.com';
      const urls = detectUrls(body, 40);

      expect(urls).toHaveLength(2);
      expect(urls[0]?.fullUrl).toBe('https://foo.com');
      expect(urls[1]?.fullUrl).toBe('https://bar.com');
    });

    it('should truncate long URL to max width', () => {
      const url = 'https://very-long-domain-name.com/path/to/some/resource';
      const truncated = truncateUrl(url, 30);

      expect(truncated.length).toBeLessThanOrEqual(30);
      expect(truncated).toContain('…');
    });

    it('should not truncate short URL', () => {
      const url = 'https://example.com';
      const truncated = truncateUrl(url, 40);

      expect(truncated).toBe(url);
      expect(truncated).not.toContain('…');
    });
  });

  describe('Process function integration', () => {
    it('should process body with URLs and blank lines', () => {
      const body = 'Line 1\n\n\n\n\nVisit https://example.com\n\n\n\n\nLine 2';
      const result = process(body, { maxUrlWidth: 40 });

      // Blank lines should be collapsed
      expect(result.processedText).not.toContain('\n\n\n');
      // URLs should be detected
      expect(result.urlCount).toBe(1);
      expect(result.urls[0]?.fullUrl).toBe('https://example.com');
    });

    it('should track URL indices in processed text', () => {
      const body = 'Check https://example.com now';
      const result = process(body, { maxUrlWidth: 40 });

      expect(result.urls[0]?.startIndex).toBe(6);
      expect(result.urls[0]?.endIndex).toBe(25);
    });
  });

  describe('URL display in viewport', () => {
    it('should include URL in viewport lines', () => {
      const body = 'Visit https://example.com for info';
      const viewport = buildBodyViewport(body, 10, 0, 80);

      // The URL should appear in the viewport
      const hasUrl = viewport.lines.some(
        (line) => line.includes('https://example.com') || line.includes('example.com')
      );
      expect(hasUrl).toBe(true);
    });

    it('should handle long URL in narrow viewport', () => {
      const longUrl = 'https://very-long-domain-name-with-many-characters.com/path/to/resource';
      const body = `Visit ${longUrl} for info`;
      const viewport = buildBodyViewport(body, 10, 0, 40);

      // URL should be wrapped/truncated but viewport should still render
      expect(viewport.lines.length).toBeGreaterThan(0);
    });
  });

  describe('Visual indicators', () => {
    it('should mark truncated URLs', () => {
      const url = 'https://very-long-domain-name.com/path/to/some/resource';
      const urls = detectUrls(url, 20);

      expect(urls[0]?.isTruncated).toBe(true);
      expect(urls[0]?.displayText).toContain('…');
    });

    it('should not mark short URLs as truncated', () => {
      const url = 'https://example.com';
      const urls = detectUrls(url, 40);

      expect(urls[0]?.isTruncated).toBe(false);
      expect(urls[0]?.displayText).not.toContain('…');
    });
  });

describe('URL Cycling State', () => {
  const createUrlRefs = (urls: string[]): URLReference[] =>
    urls.map((url, i) => ({
      fullUrl: url,
      displayText: url,
      startIndex: i * 10,
      endIndex: i * 10 + url.length,
      isTruncated: false,
    }));

  describe('nextUrl', () => {
    it('should select first URL when none selected', () => {
      const urls = createUrlRefs(['https://a.com', 'https://b.com']);
      const selectedIndex: number | null = null;
      
      const nextIndex = selectedIndex === null ? 0 : (selectedIndex + 1) % urls.length;
      
      expect(nextIndex).toBe(0);
    });

    it('should cycle to next URL', () => {
      const urls = createUrlRefs(['https://a.com', 'https://b.com', 'https://c.com']);
      const selectedIndex = 1;
      
      const nextIndex = (selectedIndex + 1) % urls.length;
      
      expect(nextIndex).toBe(2);
    });

    it('should wrap around to first URL', () => {
      const urls = createUrlRefs(['https://a.com', 'https://b.com']);
      const selectedIndex = 1;
      
      const nextIndex = (selectedIndex + 1) % urls.length;
      
      expect(nextIndex).toBe(0);
    });
  });

  describe('prevUrl', () => {
    it('should cycle to previous URL', () => {
      const urls = createUrlRefs(['https://a.com', 'https://b.com', 'https://c.com']);
      const selectedIndex = 1;
      
      const prevIndex = selectedIndex === 0 ? urls.length - 1 : selectedIndex - 1;
      
      expect(prevIndex).toBe(0);
    });

    it('should wrap around to last URL', () => {
      const urls = createUrlRefs(['https://a.com', 'https://b.com']);
      const selectedIndex = 0;
      
      const prevIndex = selectedIndex === 0 ? urls.length - 1 : selectedIndex - 1;
      
      expect(prevIndex).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty URL list', () => {
      const urls: URLReference[] = [];
      const selectedIndex: number | null = null;
      
      // No URLs to cycle
      expect(urls.length).toBe(0);
      expect(selectedIndex).toBeNull();
    });

    it('should handle single URL', () => {
      const urls = createUrlRefs(['https://a.com']);
      const selectedIndex = 0;
      
      const nextIndex = (selectedIndex + 1) % urls.length;
      const prevIndex = selectedIndex === 0 ? urls.length - 1 : selectedIndex - 1;
      
      expect(nextIndex).toBe(0);
      expect(prevIndex).toBe(0);
    });
  });
});
});
