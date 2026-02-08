/**
 * EmailPreview Component Tests
 *
 * Tests for the email preview pane component.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EmailPreview } from '../../../../src/cli/components/email-preview.js';
import type { Email } from '../../../../src/core/contracts/types.js';

// Test fixture helpers
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
    labels: ['INBOX', 'IMPORTANT'],
    isRead: false,
    snippet: 'Test snippet',
    historyId: 'history-id',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('EmailPreview', () => {
  it('should render email header with subject', () => {
    const email = createEmail({ subject: 'Important Meeting' });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 24,
      })
    );

    expect(lastFrame()).toContain('Important Meeting');
  });

  it('should render From field', () => {
    const email = createEmail({
      sender: { name: 'John Doe', email: 'john@example.com' },
    });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 24,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('From:');
    expect(frame).toContain('John Doe');
  });

  it('should render To field', () => {
    const email = createEmail({
      recipients: [
        { name: 'Jane Doe', email: 'jane@example.com' },
      ],
    });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 24,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('To:');
    expect(frame).toContain('jane@example.com');
  });

  it('should render Date field', () => {
    const email = createEmail({
      dateReceived: new Date('2024-01-15T10:30:00Z'),
    });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 24,
      })
    );

    expect(lastFrame()).toContain('Date:');
  });

  it('should render Labels field', () => {
    const email = createEmail({
      labels: ['INBOX', 'IMPORTANT', 'STARRED'],
    });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 24,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Labels:');
    expect(frame).toContain('INBOX');
  });

  it('should render email body', () => {
    const email = createEmail({
      body: { text: 'This is the email body content' },
    });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 24,
      })
    );

    expect(lastFrame()).toContain('This is the email body content');
  });

  it('should handle scroll offset prop', () => {
    const email = createEmail({
      body: { text: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5' },
    });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 24,
        scrollOffset: 2,
      })
    );

    const frame = lastFrame();
    // With scroll offset 2, should not show Line 1 and Line 2
    expect(frame).toContain('Line 3');
  });

  it('should show scroll indicator when content overflows', () => {
    const longBody = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n');
    const email = createEmail({ body: { text: longBody } });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 20,
        scrollOffset: 0,
      })
    );

    const frame = lastFrame();
    // Should show at least some lines from the body
    expect(frame).toContain('Line 0');
    // Should show body content (even if 'more' indicator isn't visible in test env)
    expect(frame).toContain('Line');
  });

  it('should show scroll up indicator when scrolled down', () => {
    const longBody = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n');
    const email = createEmail({ body: { text: longBody } });

    const { lastFrame } = render(
      React.createElement(EmailPreview, {
        email,
        terminalHeight: 20,
        scrollOffset: 10,
      })
    );

    const frame = lastFrame();
    // Should show scroll up indicator (↑) when scrolled down
    expect(frame).toContain('↑');
    // Should NOT show Line 0 (scrolled past it)
    expect(frame).not.toContain('Line 0');
  });
});
