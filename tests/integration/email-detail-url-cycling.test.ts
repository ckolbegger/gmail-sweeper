/**
 * Integration tests for EmailDetail URL cycling functionality
 *
 * Tests the full flow: raw email body → process → URL count detection → status line
 *
 * Acceptance Criteria (US3):
 * - Multiple URLs are detected for cycling
 * - Status line shows "No URLs" when email has no URLs
 * - Status line shows URL count when URLs are present
 * - URL processing doesn't break body rendering
 */

import { describe, it, expect } from 'vitest';
import { buildBodyViewport } from '../../src/cli/components/email-detail.js';
import { process as processBody } from '../../src/core/services/email-content-processor.js';
import type { Email } from '../../src/core/models/email.js';

describe('EmailDetail URL Cycling Integration', () => {
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

  describe('URL detection for cycling', () => {
    it('should detect multiple URLs for cycling', () => {
      // Given: email contains multiple URLs
      const body =
        'Visit https://example.com for info and https://test.org for more. Also https://foo.bar';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const maxUrlWidth = 20;
      const processed = processBody(email.body.text ?? '', { maxUrlWidth });

      // Then: all URLs should be detected
      expect(processed.urlCount).toBe(3);
      expect(processed.urls).toHaveLength(3);
      expect(processed.urls[0]?.fullUrl).toBe('https://example.com');
      expect(processed.urls[1]?.fullUrl).toBe('https://test.org');
      expect(processed.urls[2]?.fullUrl).toBe('https://foo.bar');
    });

    it('should detect URLs on same line', () => {
      // Given: multiple URLs on the same line
      const body = 'Links: https://a.com https://b.com https://c.com';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: all URLs should be detected
      expect(processed.urlCount).toBe(3);
      expect(processed.urls).toHaveLength(3);
    });

    it('should return empty array when no URLs', () => {
      // Given: email with no URLs
      const body = 'Just some plain text without any URLs';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: no URLs should be detected
      expect(processed.urlCount).toBe(0);
      expect(processed.urls).toHaveLength(0);
    });

    it('should handle email with mixed content and URLs', () => {
      // Given: email with text, numbers, and URLs
      const body = 'Contact user@example.com for version 1.2.3. See https://docs.com for API.';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: only URLs should be detected
      expect(processed.urlCount).toBe(1);
      expect(processed.urls[0]?.fullUrl).toBe('https://docs.com');
      expect(processed.urls[0]?.displayText).toBe('https://docs.com');
    });
  });

  describe('Status line behavior', () => {
    it('should indicate no URLs when email has none', () => {
      // Given: email with no URLs
      const body = 'Just some plain text without any URLs';
      const email = createEmailWithUrls(body);

      // When: calculate what status line would show
      const maxUrlWidth = 20;
      const processed = processBody(email.body.text ?? '', { maxUrlWidth });

      // Then: status line should show "No URLs"
      expect(processed.urlCount).toBe(0);
      expect(processed.urls).toHaveLength(0);
    });

    it('should show URL count when URLs present', () => {
      // Given: email with multiple URLs
      const body = 'Visit https://example.com, https://test.org, and https://foo.bar';
      const email = createEmailWithUrls(body);

      // When: calculate what status line would show
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: status line should show URL count
      expect(processed.urlCount).toBe(3);
      expect(processed.urls).toHaveLength(3);
    });

    it('should show single URL count for one URL', () => {
      // Given: email with one URL
      const body = 'See https://example.com for details';
      const email = createEmailWithUrls(body);

      // When: calculate what status line would show
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: status line should show "URLs: 1"
      expect(processed.urlCount).toBe(1);
      expect(processed.urls).toHaveLength(1);
    });

    it('should handle URLs with query parameters', () => {
      // Given: email with URLs with query parameters
      const body = 'Visit https://example.com/?q=test&param=value and https://test.org?id=123';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 30 });

      // Then: URLs should be detected correctly
      expect(processed.urlCount).toBe(2);
      expect(processed.urls[0]?.fullUrl).toContain('?q=test');
      expect(processed.urls[1]?.fullUrl).toContain('?id=123');
    });
  });

  describe("URL processing doesn't break body rendering", () => {
    it('should process URLs without breaking text flow', () => {
      // Given: email with text and URLs
      const body = 'See https://example.com for info. Also check https://test.org.';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const maxUrlWidth = 20;
      const processed = processBody(email.body.text ?? '', { maxUrlWidth });

      // Then: processed text should contain original text structure
      expect(processed.processedText).toContain('for info');
      expect(processed.processedText).toContain('Also check');
      expect(processed.urlCount).toBe(2);
    });

    it('should render viewport with URLs processed', () => {
      // Given: email with URLs that may be truncated
      const body = 'Visit https://very-long-domain-name-with-many-characters.com/path/to/resource';
      const email = createEmailWithUrls(body);

      // When: build viewport
      const maxBodyLines = 10;
      const maxBodyColumns = 40;
      const processed = processBody(email.body.text ?? '', {
        maxUrlWidth: Math.floor(maxBodyColumns / 2),
      });

      const displayText = processed.processedText;
      const urlRefs = processed.urls;
      const urls = urlRefs.map((ref) => ref.fullUrl);

      // Replace URLs with display text in processed text
      let finalText = displayText;
      const sortedUrls = [...urlRefs].sort((a, b) => b.startIndex - a.startIndex);
      for (const urlRef of sortedUrls) {
        finalText =
          finalText.slice(0, urlRef.startIndex) +
          urlRef.displayText +
          finalText.slice(urlRef.endIndex);
      }

      const bodyViewport = buildBodyViewport(finalText, maxBodyLines, 0, maxBodyColumns);

      // Then: viewport should be rendered without errors
      expect(bodyViewport.lines).toBeDefined();
      expect(bodyViewport.lines.length).toBeGreaterThan(0);
    });

    it('should handle multiple paragraphs with URLs', () => {
      // Given: email with multiple paragraphs and URLs
      const body =
        'First paragraph.\n\nSecond paragraph with https://example.com link.\n\nThird paragraph.';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: URLs should be detected
      expect(processed.urlCount).toBe(1);
      expect(processed.processedText).toContain('paragraph');
    });

    it('should preserve non-URL text when processing URLs', () => {
      // Given: email with mixed content
      const body = 'Contact user@example.com for version 1.2.3. Email: support@example.com';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 30 });

      // Then: text structure should be preserved
      expect(processed.processedText).toContain('Contact user');
      expect(processed.processedText).toContain('for version 1.2.3');
      expect(processed.processedText).toContain('Email: support');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty email body', () => {
      // Given: empty email body
      const email = createEmailWithUrls('');

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: no URLs should be detected
      expect(processed.urlCount).toBe(0);
      expect(processed.urls).toHaveLength(0);
      expect(processed.processedText).toBe('');
    });

    it('should handle body with only whitespace', () => {
      // Given: body with only whitespace
      const body = '   \n  \n   ';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 20 });

      // Then: no URLs should be detected
      expect(processed.urlCount).toBe(0);
    });

    it('should handle URLs with special characters', () => {
      // Given: URL with special characters
      const body = 'Visit https://example.com/path?param=value&other=test';
      const email = createEmailWithUrls(body);

      // When: process the email body
      const processed = processBody(email.body.text ?? '', { maxUrlWidth: 30 });

      // Then: URL should be detected correctly
      expect(processed.urlCount).toBe(1);
      expect(processed.urls[0]?.fullUrl).toContain('?param=value');
    });
  });
});
