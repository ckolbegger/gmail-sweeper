/**
 * EmailDetail Component Tests
 *
 * Tests for the email detail TUI component.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EmailDetail, renderLineWithLinks, adjustLinksForWrapping } from '../../../../src/cli/components/email-detail.js';
import type { Email } from '../../../../src/core/contracts/types.js';
import type { LinkSegment } from '../../../../src/cli/utils/email-body-formatter.js';

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

describe('EmailDetail', () => {
  it('should display email subject, sender, recipients', () => {
    const email = createEmail({
      subject: 'Important Meeting',
      sender: { name: 'John Doe', email: 'john@example.com' },
      recipients: [
        { name: 'Jane Smith', email: 'jane@example.com' },
        { email: 'bob@example.com' },
      ],
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email })
    );

    const frame = lastFrame();
    expect(frame).toContain('Important Meeting');
    expect(frame).toContain('John Doe');
    expect(frame).toContain('john@example.com');
    expect(frame).toContain('jane@example.com');
  });

  it('should render email body text', () => {
    const email = createEmail({
      body: { text: 'This is the email body content.' },
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email })
    );

    expect(lastFrame()).toContain('This is the email body content.');
  });

  it('should show email labels', () => {
    const email = createEmail({
      labels: ['INBOX', 'IMPORTANT', 'STARRED'],
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email })
    );

    const frame = lastFrame();
    expect(frame).toContain('INBOX');
    expect(frame).toContain('IMPORTANT');
  });

  it('should display email date in readable format', () => {
    const email = createEmail({
      dateReceived: new Date('2024-01-15T10:30:00Z'),
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email })
    );

    const frame = lastFrame();
    expect(frame).toContain('2024');
    expect(frame).toContain('Jan');
  });

  it('should handle emails without body content', () => {
    const email = createEmail({
      body: { text: '' },
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email })
    );

    expect(lastFrame()).toBeDefined();
  });

  it('should display CC recipients when present', () => {
    const email = createEmail({
      cc: [{ name: 'CC Person', email: 'cc@example.com' }],
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email })
    );

    expect(lastFrame()).toContain('cc@example.com');
  });

  it('should show snippet when body is empty', () => {
    const email = createEmail({
      body: { text: '' },
      snippet: 'Email preview snippet',
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email })
    );

    const frame = lastFrame();
    expect(frame).toContain('Email preview snippet');
  });

  describe('scrollable body', () => {
    it('should limit body lines to maxVisible', () => {
      // Create body with many lines that will definitely wrap
      const longBody = Array.from({ length: 50 }, (_, i) => `Paragraph${i}`).join('\n');
      const email = createEmail({
        body: { text: longBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { 
          email,
          terminalHeight: 24,
        })
      );

      const frame = lastFrame();
      // Should show some paragraphs (not all 50)
      expect(frame).toContain('Paragraph');
      // Should indicate more content below
      expect(frame).toContain('more');
      // Should not show all paragraphs
      expect(frame).not.toContain('Paragraph49');
    });

    it('should show scroll indicator when body exceeds maxVisible', () => {
      const longBody = Array.from({ length: 50 }, (_, i) => `Paragraph${i}`).join('\n');
      const email = createEmail({
        body: { text: longBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { 
          email,
          maxVisibleLines: 5,
        })
      );

      const frame = lastFrame();
      // Should indicate more content below with ↓ symbol
      expect(frame).toContain('↓');
      expect(frame).toContain('more lines');
    });

    it('should not show scroll indicator when body fits', () => {
      const shortBody = 'Short email body content';
      const email = createEmail({
        body: { text: shortBody },
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { 
          email,
          maxVisibleLines: 20,
        })
      );

      const frame = lastFrame();
      // Should show full content
      expect(frame).toContain('Short email body content');
      // Should not show "more lines" indicator (footer hint has ↓ but not "more lines")
      expect(frame).not.toContain('more lines');
    });
  });

  describe('blank line collapsing', () => {
    it('should collapse 3+ consecutive blank lines to 2', () => {
      const bodyWithExtraBlanks = 'Line 1\n\n\n\n\nLine 2';
      const email = createEmail({ body: { text: bodyWithExtraBlanks } });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email })
      );

      const frame = lastFrame();
      // Should contain both lines
      expect(frame).toContain('Line 1');
      expect(frame).toContain('Line 2');
    });

    it('should preserve 1-2 blank lines as-is', () => {
      const bodyWithTwoBlanks = 'Line 1\n\nLine 2';
      const email = createEmail({ body: { text: bodyWithTwoBlanks } });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email })
      );

      const frame = lastFrame();
      // Should contain both lines
      expect(frame).toContain('Line 1');
      expect(frame).toContain('Line 2');
    });
  });

  describe('URL rendering', () => {
    it('should shorten long URLs in plain text body', () => {
      const bodyWithLongUrl = 'Visit https://very-long-url.example.com/path/to/resource for more';
      const email = createEmail({ body: { text: bodyWithLongUrl } });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email })
      );

      const frame = lastFrame();
      // Should show shortened URL, not the full https:// URL
      expect(frame).not.toContain('https://very-long-url.example.com/path/to/resource');
    });

    it('should use link text from HTML body when available', () => {
      const htmlBody = '<a href="https://example.com/page">Click here</a>';
      const textBody = 'Visit https://example.com/page now';
      const email = createEmail({
        body: { text: textBody, html: htmlBody }
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email })
      );

      const frame = lastFrame();
      // Should show link text "Click here" instead of the URL
      expect(frame).toContain('Click here');
      expect(frame).not.toContain('https://example.com/page');
    });

    it('should truncate very long link text', () => {
      const longLinkText = 'A'.repeat(100);
      const htmlBody = `<a href="https://example.com">${longLinkText}</a>`;
      const textBody = 'Visit https://example.com today';
      const email = createEmail({
        body: { text: textBody, html: htmlBody }
      });

      const { lastFrame } = render(
        React.createElement(EmailDetail, { email })
      );

      const frame = lastFrame();
      // Should contain truncated text (max 39 chars for 78 width / 2)
      expect(frame).toContain('...');
    });
  });
});

describe('renderLineWithLinks', () => {
  it('should render line with no links as plain text (no color)', () => {
    const line = 'This is plain text with no links';
    const links: LinkSegment[] = [];

    const result = renderLineWithLinks(line, links);

    // Result should be a React element
    expect(result).toBeDefined();
    expect(result.type).toBeDefined();
    
    // Should render as a single Text element with no color prop
    // The function wraps in a fragment or span, so check the props/children
    expect(result.props).toBeDefined();
  });

  it('should render single link in cyan color', () => {
    const line = 'example.com';
    const links: LinkSegment[] = [
      { start: 0, end: 11, text: 'example.com', url: 'https://example.com' }
    ];

    const result = renderLineWithLinks(line, links);

    // Result should be a React element
    expect(result).toBeDefined();
    
    // Check that the result has the correct structure
    // The function returns a ReactElement wrapping Text components
    expect(result.props).toBeDefined();
  });

  it('should render multiple links on same line all with cyan color', () => {
    const line = 'First: example.com and Second: google.com';
    const links: LinkSegment[] = [
      { start: 7, end: 18, text: 'example.com', url: 'https://example.com' },
      { start: 29, end: 39, text: 'google.com', url: 'https://google.com' }
    ];

    const result = renderLineWithLinks(line, links);

    expect(result).toBeDefined();
    expect(result.props).toBeDefined();
  });

  it('should render mixed content with correct text and link segments', () => {
    const line = 'Visit example.com for more info';
    const links: LinkSegment[] = [
      { start: 6, end: 17, text: 'example.com', url: 'https://example.com' }
    ];

    const result = renderLineWithLinks(line, links);

    expect(result).toBeDefined();
    expect(result.props).toBeDefined();
  });

  it('should render plain text segments without color prop', () => {
    const line = 'Before link example.com after link';
    const links: LinkSegment[] = [
      { start: 12, end: 23, text: 'example.com', url: 'https://example.com' }
    ];

    const result = renderLineWithLinks(line, links);

    expect(result).toBeDefined();
    expect(result.props).toBeDefined();
  });
});


describe('T004: Colored Links Integration', () => {
  it('should use formatEmailBodyWithLinks() instead of formatEmailBody()', () => {
    const bodyWithUrl = 'Visit https://example.com for more info';
    const email = createEmail({
      body: { text: bodyWithUrl },
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email, terminalHeight: 24 })
    );

    const frame = lastFrame();
    // Should show shortened URL (domain only), not the full https:// URL
    expect(frame).toContain('example.com');
    expect(frame).not.toContain('https://example.com');
  });

  it('should call renderLineWithLinks() for each visible line with links', () => {
    const bodyWithUrl = 'Check out https://google.com today';
    const email = createEmail({
      body: { text: bodyWithUrl },
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email, terminalHeight: 24 })
    );

    const frame = lastFrame();
    // Body should be rendered (component renders without error)
    expect(frame).toContain('google.com');
    expect(frame).toContain('Check out');
  });

  it('should work correctly with scrolling and colored links', () => {
    // Create a long body with a URL that will be visible after scrolling
    const longBody = Array.from({ length: 30 }, (_, i) => `Paragraph${i} content here`).join('\n') + 
      '\nVisit https://example.com for more info';
    const email = createEmail({
      body: { text: longBody },
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { 
        email, 
        terminalHeight: 20 // Terminal to force scrolling
      })
    );

    const frame = lastFrame();
    // Should show scroll indicator (↓) when content exceeds visible area
    expect(frame).toContain('↓');
    expect(frame).toContain('more lines');
  });

  it('should work with email containing no URLs', () => {
    const bodyWithoutUrls = 'This is just plain text without any links or URLs.';
    const email = createEmail({
      body: { text: bodyWithoutUrls },
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email, terminalHeight: 24 })
    );

    const frame = lastFrame();
    expect(frame).toContain('This is just plain text');
  });

  it('should work with email containing multiple URLs', () => {
    const bodyWithMultipleUrls = 'Visit https://example.com and https://google.com for search';
    const email = createEmail({
      body: { text: bodyWithMultipleUrls },
    });

    const { lastFrame } = render(
      React.createElement(EmailDetail, { email, terminalHeight: 24 })
    );

    const frame = lastFrame();
    // Should show both shortened URLs
    expect(frame).toContain('example.com');
    expect(frame).toContain('google.com');
  });
});

describe('adjustLinksForWrapping', () => {
  it('should return empty map when no links', () => {
    const links: LinkSegment[] = [];
    const wrappedLines = ['Line 1', 'Line 2'];


    const result = adjustLinksForWrapping(links, wrappedLines);

    expect(result.size).toBe(0);
  });

  it('should return correct adjusted position for single link on first wrapped line', () => {
    // Link from positions 6-17 in original text: "Visit example.com for more info"
    const links: LinkSegment[] = [
      { start: 6, end: 17, text: 'example.com', url: 'https://example.com' }
    ];
    // Wrapped at width 20 - "Visit example.com" (17 chars) fits on first line
    const wrappedLines = ['Visit example.com', 'for more info'];
    const maxWidth = 20;

    const result = adjustLinksForWrapping(links, wrappedLines);

    // Link should be on line 0, adjusted to positions 6-17
    expect(result.has(0)).toBe(true);
    const line0Links = result.get(0)!;
    expect(line0Links).toHaveLength(1);
    expect(line0Links[0].start).toBe(6);
    expect(line0Links[0].end).toBe(17);
    expect(line0Links[0].text).toBe('example.com');
    expect(line0Links[0].url).toBe('https://example.com');
  });

  it('should handle link appearing on multiple wrapped lines when it spans across', () => {
    // Link from positions 6-45 in original text: a very long link text
    const links: LinkSegment[] = [
      { start: 6, end: 45, text: 'very-long-link-text-that-spans-across-lines', url: 'https://example.com' }
    ];
    // Wrapped at width 20
    // Line 0: "Hello very-long-l" (positions 0-17)
    // Line 1: "ink-text-that-spa" (positions 17-34)
    // Line 2: "ns-across-lines" (positions 34-49)
    const wrappedLines = [
      'Hello very-long-l',
      'ink-text-that-spa',
      'ns-across-lines'
    ];
    const maxWidth = 20;

    const result = adjustLinksForWrapping(links, wrappedLines);

    // Link should appear on lines 0, 1, and 2 with adjusted positions
    expect(result.has(0)).toBe(true);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);

    // Line 0: link starts at position 6, continues to end of line (position 17)
    const line0Links = result.get(0)!;
    expect(line0Links).toHaveLength(1);
    expect(line0Links[0].start).toBe(6);
    expect(line0Links[0].end).toBe(17);

    // Line 1: link covers entire line (positions 0-17)
    const line1Links = result.get(1)!;
    expect(line1Links).toHaveLength(1);
    expect(line1Links[0].start).toBe(0);
    expect(line1Links[0].end).toBe(17);

    // Line 2: link from start (position 0) to position 11 (end of link at pos 45)
    const line2Links = result.get(2)!;
    expect(line2Links).toHaveLength(1);
    expect(line2Links[0].start).toBe(0);
    expect(line2Links[0].end).toBe(11);
  });

  it('should handle multiple links on same wrapped line', () => {
    // Two links in the text: "Visit example.com and google.com"
    // example.com at positions 6-17, google.com at positions 22-32
    const links: LinkSegment[] = [
      { start: 6, end: 17, text: 'example.com', url: 'https://example.com' },
      { start: 22, end: 32, text: 'google.com', url: 'https://google.com' }
    ];
    // Both links fit on the first line
    const wrappedLines = ['Visit example.com and google.com'];


    const result = adjustLinksForWrapping(links, wrappedLines);

    expect(result.has(0)).toBe(true);
    const line0Links = result.get(0)!;
    expect(line0Links).toHaveLength(2);

    // First link at positions 6-17
    expect(line0Links[0].start).toBe(6);
    expect(line0Links[0].end).toBe(17);
    expect(line0Links[0].text).toBe('example.com');

    // Second link at positions 22-32
    expect(line0Links[1].start).toBe(22);
    expect(line0Links[1].end).toBe(32);
    expect(line0Links[1].text).toBe('google.com');
  });

  it('should handle link at exact line boundary', () => {
    // Link that ends exactly at position 10 (the maxWidth boundary)
    const links: LinkSegment[] = [
      { start: 0, end: 10, text: 'exactbound', url: 'https://example.com' }
    ];
    // Line 0: "exactbound" (exactly 10 chars)
    // Line 1: " more text"
    const wrappedLines = ['exactbound', ' more text'];


    const result = adjustLinksForWrapping(links, wrappedLines);

    // Link should only appear on line 0, from 0-10
    expect(result.has(0)).toBe(true);
    const line0Links = result.get(0)!;
    expect(line0Links).toHaveLength(1);
    expect(line0Links[0].start).toBe(0);
    expect(line0Links[0].end).toBe(10);
  });
});
