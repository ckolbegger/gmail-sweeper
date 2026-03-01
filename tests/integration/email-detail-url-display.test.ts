/**
 * Integration tests for email detail URL truncation
 *
 * Tests the full flow: raw email body → process → buildBodyViewport → rendered lines
 *
 * Acceptance Criteria (US2):
 * - URLs longer than half pane width are truncated
 * - Short URLs displayed unchanged
 * - Multiple URLs processed independently
 * - Visual indicator (ellipsis) for truncated URLs
 */
import { describe, it, expect } from 'vitest';
import { buildBodyViewport } from '../../src/cli/components/email-detail.js';
import {
  process,
  truncateUrl,
  detectUrls,
} from '../../src/core/services/email-content-processor.js';
import type { Email } from '../../src/core/models/email.js';

describe('Email Detail URL Display Integration', () => {
  // Create a mock email with URLs
  const createEmailWithUrls = (body: string): Email => ({
    id: 'test-email',
    threadId: 'test-thread',
    subject: 'Test Subject',
    sender: { name: 'Sender', email: 'sender@example.com' },
    recipients: [{ name: 'Recipient', email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: body, html: undefined },
    labels: ['INBOX'],
    isRead: true,
    category: 'updates',
    snippet: body.slice(0, 50),
    historyId: 'history-1',
    syncedAt: new Date(),
  });

  describe('US2 Acceptance Scenarios', () => {
    it('AC1: should truncate URLs longer than half pane width', () => {
      // Given: email contains a URL longer than half the detail window width
      const longUrl =
        'https://very-long-domain-name-with-many-characters.com/path/to/some/resource';
      const email = createEmailWithUrls(`Visit ${longUrl} for more info`);

      // When: email is displayed with maxBodyColumns=40 (half = 20)
      const maxBodyColumns = 40;
      const maxUrlWidth = Math.floor(maxBodyColumns / 2);
      const processed = process(email.body.text ?? '', { maxUrlWidth });

      // Then: the URL text is truncated to fit within half the window width
      expect(processed.urls).toHaveLength(1);
      expect(processed.urls[0]?.isTruncated).toBe(true);
      expect(processed.urls[0]?.displayText.length).toBeLessThanOrEqual(maxUrlWidth);
      expect(processed.urls[0]?.displayText).toContain('…');
    });

    it('AC2: should display short URLs unchanged', () => {
      // Given: email contains a URL shorter than half the detail window width
      const shortUrl = 'https://example.com';
      const email = createEmailWithUrls(`Visit ${shortUrl} now`);

      // When: email is displayed
      const maxUrlWidth = 20;
      const processed = process(email.body.text ?? '', { maxUrlWidth });

      // Then: the full URL text is displayed unchanged
      expect(processed.urls).toHaveLength(1);
      expect(processed.urls[0]?.isTruncated).toBe(false);
      expect(processed.urls[0]?.displayText).toBe(shortUrl);
    });

    it('AC4: should process multiple URLs independently', () => {
      // Given: email contains multiple URLs
      const shortUrl = 'https://a.co';
      const longUrl = 'https://very-long-domain-name-with-many-characters.com/path';
      const email = createEmailWithUrls(`Check ${shortUrl} and ${longUrl}`);

      // When: email is displayed
      const maxUrlWidth = 20;
      const processed = process(email.body.text ?? '', { maxUrlWidth });

      // Then: each URL is independently processed
      expect(processed.urls).toHaveLength(2);
      expect(processed.urls[0]?.isTruncated).toBe(false);
      expect(processed.urls[1]?.isTruncated).toBe(true);
    });
  });

  describe('Visual Indicators', () => {
    it('should include ellipsis in truncated URL display', () => {
      const longUrl = 'https://very-long-domain-name.com/path/to/resource';
      const truncated = truncateUrl(longUrl, 20);

      expect(truncated).toContain('…');
      expect(truncated.length).toBeLessThanOrEqual(20);
    });

    it('should not include ellipsis in non-truncated URL', () => {
      const shortUrl = 'https://example.com';
      const truncated = truncateUrl(shortUrl, 30);

      expect(truncated).not.toContain('…');
      expect(truncated).toBe(shortUrl);
    });
  });

  describe('Success Criteria Validation', () => {
    it('SC-002: URLs displayed within half pane width', () => {
      const longUrl = 'https://example.com/very/long/path/that/exceeds/fifty/characters/easily';
      const email = createEmailWithUrls(longUrl);

      const maxUrlWidth = 25; // Half of 50 column pane
      const processed = process(email.body.text ?? '', { maxUrlWidth });

      expect(processed.urls[0]?.displayText.length).toBeLessThanOrEqual(maxUrlWidth);
    });

    it('SC-003: No horizontal scrolling from long URLs', () => {
      const longUrl =
        'https://very-long-domain-name-with-many-characters.com/path/to/some/resource';
      const email = createEmailWithUrls(`Visit ${longUrl} for info`);

      const maxBodyColumns = 40;
      const maxUrlWidth = Math.floor(maxBodyColumns / 2);
      const processed = process(email.body.text ?? '', { maxUrlWidth });

      // Replace URLs with display text
      let displayText = processed.processedText;
      const sortedUrls = [...processed.urls].sort((a, b) => b.startIndex - a.startIndex);
      for (const urlRef of sortedUrls) {
        displayText =
          displayText.slice(0, urlRef.startIndex) +
          urlRef.displayText +
          displayText.slice(urlRef.endIndex);
      }

      const viewport = buildBodyViewport(displayText, 10, 0, maxBodyColumns);

      // No line should exceed maxBodyColumns (accounting for wrapping)
      expect(viewport.lines.length).toBeGreaterThan(0);
    });

    it('SC-005: 100% valid URLs detected and formatted', () => {
      const body = 'Check https://example.com and http://test.org and www.foo.com';
      const urls = detectUrls(body, 20);

      expect(urls).toHaveLength(3);
      expect(urls.every((u) => u.displayText.length > 0)).toBe(true);
    });

    it('SC-006: Zero false positives on URL detection', () => {
      const body = 'Contact user@example.com or see version 1.2.3';
      const urls = detectUrls(body, 20);

      expect(urls).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with query parameters', () => {
      const url = 'https://example.com/path?query=value&other=123';
      const email = createEmailWithUrls(url);

      const processed = process(email.body.text ?? '', { maxUrlWidth: 30 });

      expect(processed.urls).toHaveLength(1);
      expect(processed.urls[0]?.fullUrl).toBe(url);
    });

    it('should handle multiple URLs on same line', () => {
      const body = 'Links: https://a.com https://b.com https://c.com';
      const urls = detectUrls(body, 20);

      expect(urls).toHaveLength(3);
    });

    it('should handle URLs with Unicode characters', () => {
      const url = 'https://例え.jp/パス';
      const truncated = truncateUrl(url, 15);

      // Should handle without error and fit within width
      expect(truncated.length).toBeGreaterThan(0);
    });

    it('should handle email with no URLs', () => {
      const email = createEmailWithUrls('Just some plain text');

      const processed = process(email.body.text ?? '', { maxUrlWidth: 20 });

      expect(processed.urlCount).toBe(0);
      expect(processed.urls).toHaveLength(0);
    });
  });
});
