/**
 * EmailDetail Component Tests
 *
 * Tests for the email detail TUI component.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EmailDetail } from '../../../../src/cli/components/email-detail.js';
import type { Email } from '../../../../src/core/contracts/types.js';

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
});
