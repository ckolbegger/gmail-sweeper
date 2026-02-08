/**
 * T038: Unit tests for EmailPreview component.
 * Tests email display, body rendering, and state handling.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import type { Email, EmailAddress, Label } from '../../../src/core/models/index.js';
import { EmailPreview } from '../../../src/tui/components/EmailPreview.js';

function createTestEmail(id: string, overrides?: Partial<Email>): Email {
  const sender: EmailAddress = {
    email: 'sender@example.com',
    name: 'Sender Name',
  };

  const labels: Label[] = [
    { id: 'INBOX', name: 'INBOX', type: 'system' },
  ];

  return {
    id,
    threadId: `thread-${id}`,
    subject: overrides?.subject || `Test Subject ${id}`,
    sender: overrides?.sender || sender,
    recipients: overrides?.recipients || [
      { email: 'recipient1@example.com', name: 'Recipient 1' },
      { email: 'recipient2@example.com', name: 'Recipient 2' },
    ],
    date: overrides?.date || new Date(),
    snippet: `Snippet for ${id}`,
    bodyText: overrides?.bodyText || `Body text for ${id}`,
    bodyHtml: overrides?.bodyHtml,
    labels: overrides?.labels || labels,
    isRead: overrides?.isRead ?? false,
    isStarred: overrides?.isStarred ?? false,
    hasAttachments: overrides?.hasAttachments ?? false,
  };
}

describe('EmailPreview', () => {
  describe('T038: Display', () => {
    it('should display email subject as header', () => {
      const email = createTestEmail('1', { subject: 'Important Email' });

      const { lastFrame } = render(
        <EmailPreview email={email} />
      );

      const output = lastFrame();
      expect(output).toContain('Important Email');
    });

    it('should display sender and recipients', () => {
      const email = createTestEmail('1', {
        sender: { email: 'alice@example.com', name: 'Alice' },
        recipients: [
          { email: 'bob@example.com', name: 'Bob' },
          { email: 'charlie@example.com', name: 'Charlie' },
        ],
      });

      const { lastFrame } = render(
        <EmailPreview email={email} />
      );

      const output = lastFrame();
      expect(output).toContain('Alice');
      expect(output).toContain('Bob');
      expect(output).toContain('Charlie');
    });

    it('should display email body', () => {
      const email = createTestEmail('1', {
        bodyText: 'This is the email body content.',
      });

      const { lastFrame } = render(
        <EmailPreview email={email} />
      );

      const output = lastFrame();
      expect(output).toContain('This is the email body content.');
    });

    it('should render empty state when no email selected', () => {
      const { lastFrame } = render(
        <EmailPreview email={undefined} />
      );

      const output = lastFrame();
      expect(output).toMatch(/no email|empty|select an email/i);
    });

    it('should handle HTML body conversion to text', () => {
      const baseEmail = createTestEmail('1');
      const email: Email = {
        ...baseEmail,
        bodyHtml: '<p>HTML paragraph</p><a href="#">link</a>',
        bodyText: undefined,
      };

      const { lastFrame } = render(
        <EmailPreview email={email} />
      );

      const output = lastFrame();
      // Should convert HTML to readable text
      expect(output).toContain('HTML paragraph');
    });

    it('should scroll long email body', () => {
      const longBody = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11\nLine 12\nLine 13\nLine 14\nLine 15';
      const email = createTestEmail('1', { bodyText: longBody });

      const { lastFrame } = render(
        <EmailPreview email={email} maxHeight={5} />
      );

      const output = lastFrame();
      expect(output).toBeTruthy();
      // Should be able to display even with max height
      expect(output.length).toBeGreaterThan(0);
    });

    it('should show attachment count if present', () => {
      const email = createTestEmail('1', { hasAttachments: true });

      const { lastFrame } = render(
        <EmailPreview email={email} />
      );

      const output = lastFrame();
      expect(output).toMatch(/attachment|📎|\[\d+ file/i);
    });

    it('should handle emails with no body (boundary)', () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: undefined,
      });

      const { lastFrame } = render(
        <EmailPreview email={email} />
      );

      const output = lastFrame();
      // Should not crash and show appropriate message
      expect(output).toContain('Test Subject 1');
    });
  });
});
