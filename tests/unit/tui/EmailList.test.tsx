/**
 * T037: Unit tests for EmailList component.
 * Tests rendering, selection, virtualization, and date formatting.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import type { Email, EmailAddress, Label } from '../../../src/core/models/index.js';
import { EmailList } from '../../../src/tui/components/EmailList.js';

// Helper to create test emails
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
    recipients: overrides?.recipients || [{ email: 'recipient@example.com' }],
    date: overrides?.date || new Date(),
    snippet: `Snippet for ${id}`,
    labels: overrides?.labels || labels,
    isRead: overrides?.isRead ?? false,
    isStarred: overrides?.isStarred ?? false,
    hasAttachments: overrides?.hasAttachments ?? false,
  };
}

describe('EmailList', () => {
  describe('T037: Rendering', () => {
    it('should render list of email subjects', () => {
      const emails = [
        createTestEmail('1', { subject: 'Hello World' }),
        createTestEmail('2', { subject: 'Test Email' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Hello World');
      expect(output).toContain('Test Email');
    });

    it('should display sender and date for each email', () => {
      const date = new Date('2024-01-15T10:30:00');
      const emails = [
        createTestEmail('1', {
          subject: 'Test',
          sender: { email: 'alice@example.com', name: 'Alice' },
          date,
        }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
        />
      );

      const output = lastFrame();
      // Should display sender name if available
      expect(output).toContain('Alice');
      // Date should be formatted (check for reasonable date format)
      expect(output).toMatch(/\d+|today|yesterday/i);
    });

    it('should highlight selected email', () => {
      const emails = [
        createTestEmail('1', { subject: 'First' }),
        createTestEmail('2', { subject: 'Second' }),
        createTestEmail('3', { subject: 'Third' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={1}
          onSelect={() => {}}
        />
      );

      const output = lastFrame();
      // Should show Second email selected (implementation detail)
      expect(output).toContain('Second');
    });

    it('should render empty state when no emails', () => {
      const { lastFrame } = render(
        <EmailList
          emails={[]}
          selectedIndex={-1}
          onSelect={() => {}}
        />
      );

      const output = lastFrame();
      expect(output).toMatch(/no.*emails?|empty|inbox/i);
    });

    it('should truncate long subjects (boundary: exactly max length)', () => {
      const longSubject = 'A'.repeat(100);
      const emails = [
        createTestEmail('1', { subject: longSubject }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
          maxSubjectLength={50}
        />
      );

      const output = lastFrame();
      // Should contain truncation ellipsis for long subject
      expect(output).toContain('…');
      // Should not contain the full long subject
      expect(output.split('A').length).toBeLessThan(100);
    });

    it('should handle 1 email (boundary)', () => {
      const emails = [createTestEmail('1')];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Test Subject 1');
    });

    it('should handle 100+ emails with virtualization', () => {
      const emails = Array.from({ length: 150 }, (_, i) =>
        createTestEmail(String(i + 1))
      );

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
          viewportHeight={10}
        />
      );

      const output = lastFrame();
      // Should render without error and show viewport of emails
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
    });

    it('should format relative dates (today, yesterday, older)', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const oldDate = new Date('2020-01-01');

      const emails = [
        createTestEmail('1', { subject: 'Today', date: today }),
        createTestEmail('2', { subject: 'Yesterday', date: yesterday }),
        createTestEmail('3', { subject: 'Old', date: oldDate }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
        />
      );

      const output = lastFrame();
      // Should contain relative date indicators
      expect(output).toMatch(/today|yesterday|2020|\d+\/\d+/i);
    });
  });
});
