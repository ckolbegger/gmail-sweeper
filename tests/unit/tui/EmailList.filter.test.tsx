/**
 * T037-FILTER: Unit tests for EmailList filter mode.
 * Tests filter count display, filtering behavior, and empty filter state.
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

  const labels: Label[] = [{ id: 'INBOX', name: 'INBOX', type: 'system' }];

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

describe('EmailList Filter Mode', () => {
  describe('FR-009: Filter count display', () => {
    it('should display "Filtered: X/Y emails" count when filter is active', () => {
      const emails = [
        createTestEmail('1', { subject: 'Important Email' }),
        createTestEmail('2', { subject: 'Newsletter' }),
        createTestEmail('3', { subject: 'Promo' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
          filterActive={true}
          filterMatchCount={1}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Filtered:');
      expect(output).toContain('1/3');
    });

    it('should show correct count when multiple emails match filter', () => {
      const emails = [
        createTestEmail('1', { subject: 'Meeting' }),
        createTestEmail('2', { subject: 'Newsletter' }),
        createTestEmail('3', { subject: 'Meeting Notes' }),
        createTestEmail('4', { subject: 'Promo' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
          filterActive={true}
          filterMatchCount={2}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Filtered:');
      expect(output).toContain('2/4');
    });
  });

  describe('Filter matching behavior', () => {
    it('should show only matching emails when filter is active', () => {
      const emails = [
        createTestEmail('1', { subject: 'Meeting Request' }),
        createTestEmail('2', { subject: 'Newsletter' }),
        createTestEmail('3', { subject: 'Meeting Agenda' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={0}
          onSelect={() => {}}
          filterActive={true}
          filterMatchCount={2}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Meeting Request');
      expect(output).toContain('Meeting Agenda');
      expect(output).not.toContain('Newsletter');
    });

    it('should display all emails when filter is not active', () => {
      const emails = [
        createTestEmail('1', { subject: 'Email One' }),
        createTestEmail('2', { subject: 'Email Two' }),
      ];

      const { lastFrame } = render(
        <EmailList emails={emails} selectedIndex={0} onSelect={() => {}} filterActive={false} />
      );

      const output = lastFrame();
      expect(output).toContain('Email One');
      expect(output).toContain('Email Two');
    });
  });

  describe('FR-005: Empty filter state', () => {
    it('should show "No matches found" when filter returns empty results (acceptance scenario 4)', () => {
      const emails = [
        createTestEmail('1', { subject: 'Email One' }),
        createTestEmail('2', { subject: 'Email Two' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={-1}
          onSelect={() => {}}
          filterActive={true}
          filterMatchCount={0}
        />
      );

      const output = lastFrame();
      expect(output).toMatch(/no.*matches?|no.*results?|no.*found/i);
    });

    it('should display filter count as 0/X when no matches found', () => {
      const emails = [
        createTestEmail('1', { subject: 'Some Email' }),
        createTestEmail('2', { subject: 'Another Email' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedIndex={-1}
          onSelect={() => {}}
          filterActive={true}
          filterMatchCount={0}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Filtered:');
      expect(output).toContain('0/2');
    });
  });
});
