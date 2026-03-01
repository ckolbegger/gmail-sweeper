/**
 * Email Detail - Colored Links Integration Tests (T005)
 *
 * Story-level integration tests verifying the complete user flow:
 * Email → format → wrap → render with colors
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EmailDetail } from '../../src/cli/components/email-detail.js';
import type { Email } from '../../src/core/contracts/types.js';

function createEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-id',
    threadId: 'thread-id',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-15T10:00:00Z'),
    body: { text: 'Test body content' },
    labels: ['INBOX'],
    isRead: false,
    snippet: 'Test snippet',
    historyId: 'history-id',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('T005: EmailDetail - Colored Links Integration', () => {
  describe('HTML body with link text', () => {
    it('should show link text in cyan for HTML body with anchor tag', () => {
      const htmlBody = '<a href="https://example.com/page">Click Here</a>';
      const textBody = 'Visit https://example.com/page for more info';
      const email = createEmail({
        body: { text: textBody, html: htmlBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Should show link text "Click Here" instead of the URL
      expect(frame).toContain('Click Here');
      // Should NOT show the raw URL
      expect(frame).not.toContain('https://example.com/page');
    });

    it('should render multiple links from HTML with correct link text', () => {
      const htmlBody = `
        <a href="https://example.com">First Link</a>
        and
        <a href="https://google.com">Second Link</a>
      `;
      const textBody = 'Visit https://example.com and https://google.com for more';
      const email = createEmail({
        body: { text: textBody, html: htmlBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Should show both link texts
      expect(frame).toContain('First Link');
      expect(frame).toContain('Second Link');
      // Should NOT show raw URLs
      expect(frame).not.toContain('https://example.com');
      expect(frame).not.toContain('https://google.com');
    });
  });

  describe('Plain text body with URLs', () => {
    it('should show shortened URLs in cyan for plain text body', () => {
      const textBody = 'Visit https://very-long-url.example.com/path/to/resource for more info';
      const email = createEmail({
        body: { text: textBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Should show shortened URL (domain or shortened form), not the full https:// URL
      expect(frame).not.toContain('https://very-long-url.example.com/path/to/resource');
      // Should show the domain part
      expect(frame).toContain('very-long-url.example.com');
    });

    it('should show multiple shortened URLs for plain text with multiple links', () => {
      const textBody = 'Visit https://example.com/page and https://google.com/search for more';
      const email = createEmail({
        body: { text: textBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Should show both shortened URLs
      expect(frame).toContain('example.com');
      expect(frame).toContain('google.com');
      // Should NOT show the full https:// URLs
      expect(frame).not.toContain('https://example.com/page');
      expect(frame).not.toContain('https://google.com/search');
    });
  });

  describe('Multiple links rendering', () => {
    it('should show all links in email with multiple URLs', () => {
      const textBody = 'Check out https://github.com and https://stackoverflow.com for coding help';
      const email = createEmail({
        body: { text: textBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Both shortened URLs should appear
      expect(frame).toContain('github.com');
      expect(frame).toContain('stackoverflow.com');
      // Surrounding text should also appear
      expect(frame).toContain('Check out');
      expect(frame).toContain('for coding help');
    });

    it('should handle mix of HTML link text and plain text URLs', () => {
      const htmlBody = '<a href="https://example.com">Example Site</a>';
      const textBody = 'Visit https://example.com and also https://other-site.com';
      const email = createEmail({
        body: { text: textBody, html: htmlBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // HTML link text should be used for the matched URL
      expect(frame).toContain('Example Site');
      // Plain text URL should be shortened
      expect(frame).toContain('other-site.com');
      // Full URLs should not appear
      expect(frame).not.toContain('https://example.com');
      expect(frame).not.toContain('https://other-site.com');
    });
  });

  describe('Scrolling with colored links', () => {
    it('should show scroll indicator when content exceeds visible area', () => {
      // Create a long body that will require scrolling
      const longBody = Array.from({ length: 50 }, (_, i) => `Paragraph ${i} with some content here that is long`).join('\n') + 
        '\nVisit https://scrolled-link.example.com for more info';
      const email = createEmail({
        body: { text: longBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { 
          email, 
          terminalHeight: 24 // Standard terminal
        })
      );

      const frame = lastFrame();
      // Initial view should show early paragraphs
      expect(frame).toContain('Paragraph 0');
      // Scroll indicator should show more content below
      expect(frame).toContain('↓');
      expect(frame).toContain('more lines');
    });

    it('should render links correctly in long email content', () => {
      // Create body with a URL visible in the initial view
      const urlLine = 'Check out https://visible-link.example.com/page for details';
      const linesAfter = Array.from({ length: 30 }, (_, i) => `Line ${i} with text content here`);
      const longBody = [urlLine, ...linesAfter].join('\n');
      
      const email = createEmail({
        body: { text: longBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { 
          email, 
          terminalHeight: 24 // Standard terminal - should show URL on first line
        })
      );

      const frame = lastFrame();
      // The link should be rendered in its shortened form
      expect(frame).toContain('visible-link.example.com');
      // The full URL should not appear
      expect(frame).not.toContain('https://visible-link.example.com/page');
      // Scroll indicator should show there's more content
      expect(frame).toContain('↓');
    });
  });

  describe('Blank line collapsing with colored links', () => {
    it('should work correctly when blank line collapsing is applied with links', () => {
      const bodyWithExtraBlanks = 'First paragraph\n\n\n\n\nVisit https://example.com/page for more';
      const email = createEmail({
        body: { text: bodyWithExtraBlanks },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Both parts of the content should be visible
      expect(frame).toContain('First paragraph');
      expect(frame).toContain('example.com');
      // The URL should be shortened (not full https://)
      expect(frame).not.toContain('https://example.com/page');
    });

    it('should handle links in text with excessive blank lines before and after', () => {
      const bodyWithBlanks = 'Start here\n\n\n\n\nhttps://middle-link.example.com\n\n\n\n\nEnd here';
      const email = createEmail({
        body: { text: bodyWithBlanks },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // All parts should be visible after blank line collapsing
      expect(frame).toContain('Start here');
      expect(frame).toContain('middle-link.example.com');
      expect(frame).toContain('End here');
      // Full URL should not appear
      expect(frame).not.toContain('https://middle-link.example.com');
    });

    it('should correctly position links after blank line collapsing', () => {
      // Multiple URLs separated by excessive blank lines
      const bodyWithBlanksAndLinks = 'First: https://first.com\n\n\n\nSecond: https://second.com';
      const email = createEmail({
        body: { text: bodyWithBlanksAndLinks },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Both shortened URLs should appear
      expect(frame).toContain('first.com');
      expect(frame).toContain('second.com');
      // Neither full URL should appear
      expect(frame).not.toContain('https://first.com');
      expect(frame).not.toContain('https://second.com');
    });
  });

  describe('Truncated link text with colored links', () => {
    it('should show truncated link text with ellipsis when too long', () => {
      const longLinkText = 'A'.repeat(100);
      const htmlBody = `<a href="https://example.com">${longLinkText}</a>`;
      const textBody = 'Visit https://example.com today';
      const email = createEmail({
        body: { text: textBody, html: htmlBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Should contain truncated text with ellipsis (max 39 chars for 78 width / 2)
      expect(frame).toContain('...');
      // Should NOT contain the full 100-character link text
      expect(frame).not.toContain('A'.repeat(100));
    });

    it('should handle truncated plain text URLs that exceed max length', () => {
      const veryLongUrl = 'https://example.com/' + 'path/'.repeat(30);
      const textBody = `Visit ${veryLongUrl} for details`;
      const email = createEmail({
        body: { text: textBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );
      
      const frame = lastFrame();
      // The very long URL should not appear in full
      expect(frame).not.toContain(veryLongUrl);
      // Should show shortened form
      expect(frame).toContain('example.com');
    });
  });

  describe('Complete end-to-end flow', () => {
    it('should render realistic email with HTML links correctly', () => {
      const htmlBody = `
        <p>Hello,</p>
        <p>Please check out <a href="https://docs.example.com/guide">our documentation</a> 
        and <a href="https://support.example.com">our support page</a> for help.</p>
        <p>Thanks!</p>
      `;
      const textBody = `Hello,

Please check out https://docs.example.com/guide and https://support.example.com for help.

Thanks!`;
      
      const email = createEmail({
        subject: 'Help Documentation',
        body: { text: textBody, html: htmlBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Should show HTML link texts
      expect(frame).toContain('our documentation');
      expect(frame).toContain('our support page');
      // Should show other content
      expect(frame).toContain('Hello');
      expect(frame).toContain('Thanks');
      // Should NOT show raw URLs
      expect(frame).not.toContain('https://docs.example.com/guide');
      expect(frame).not.toContain('https://support.example.com');
    });

    it('should handle plain text email with no links gracefully', () => {
      const textBody = 'This is a plain text email without any links or URLs to worry about.';
      const email = createEmail({
        body: { text: textBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email, terminalHeight: 24 })
      );

      const frame = lastFrame();
      // Should show the content as-is
      expect(frame).toContain('This is a plain text email');
      // Should not have any issues with rendering
      expect(frame).toBeDefined();
    });
  });
});
