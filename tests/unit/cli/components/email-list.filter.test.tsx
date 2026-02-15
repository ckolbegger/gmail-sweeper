/**
 * EmailList Filter Mode Tests
 *
 * Tests for filter-related functionality in the EmailList component.
 * Covers: filtered email display, count display, and empty state.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EmailList } from '../../../../src/cli/components/email-list.js';
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
    body: { text: 'Test body' },
    labels: ['INBOX'],
    isRead: false,
    snippet: 'Test snippet',
    historyId: 'history-id',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('EmailList - Filter Mode', () => {
  describe('filter count display (FR-009)', () => {
    it('should display "Filtered: X/Y emails" count when filter is active', () => {
      const emails = [
        createEmail({ id: '1', subject: 'Email 1' }),
        createEmail({ id: '2', subject: 'Email 2' }),
        createEmail({ id: '3', subject: 'Email 3' }),
      ];

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          filterCount: 2,
          totalCount: 3,
        })
      );

      const frame = lastFrame();
      expect(frame).toContain('Filtered: 2/3 emails');
    });

    it('should display correct count with different filter ratios', () => {
      const emails = [
        createEmail({ id: '1', subject: 'Email 1' }),
        createEmail({ id: '2', subject: 'Email 2' }),
      ];

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          filterCount: 2,
          totalCount: 10,
        })
      );

      const frame = lastFrame();
      expect(frame).toContain('Filtered: 2/10 emails');
    });

    it('should not display filter count when filterCount prop is not provided', () => {
      const emails = [
        createEmail({ id: '1', subject: 'Email 1' }),
        createEmail({ id: '2', subject: 'Email 2' }),
      ];

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 0,
          onSelect: vi.fn(),
        })
      );

      const frame = lastFrame();
      expect(frame).not.toContain('Filtered:');
    });
  });

  describe('filtered email display', () => {
    it('should show only matching emails when filter is active', () => {
      const filteredEmails = [
        createEmail({ id: '1', subject: 'Matching Email 1' }),
        createEmail({ id: '3', subject: 'Matching Email 3' }),
      ];

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails: filteredEmails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          filterCount: 2,
          totalCount: 5,
          filteredEmails,
        })
      );

      const frame = lastFrame();
      expect(frame).toContain('Matching Email 1');
      expect(frame).toContain('Matching Email 3');
    });

    it('should display filtered emails with correct sender and date info', () => {
      const filteredEmails = [
        createEmail({
          id: '1',
          subject: 'Important Meeting',
          sender: { name: 'Alice', email: 'alice@example.com' },
          dateReceived: new Date('2024-01-15T10:30:00Z'),
        }),
      ];

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails: filteredEmails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          filterCount: 1,
          totalCount: 10,
          filteredEmails,
        })
      );

      const frame = lastFrame();
      expect(frame).toContain('Important Meeting');
      expect(frame).toContain('Alice');
    });
  });

  describe('empty filter results (FR-005, acceptance scenario 4)', () => {
    it('should show "No matches found" when filter returns empty results', () => {
      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails: [],
          selectedIndex: 0,
          onSelect: vi.fn(),
          filterCount: 0,
          totalCount: 5,
          filteredEmails: [],
        })
      );

      const frame = lastFrame();
      expect(frame).toContain('No matches found');
    });

    it('should show "No matches found" instead of "No emails" when filter is active with no results', () => {
      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails: [],
          selectedIndex: 0,
          onSelect: vi.fn(),
          filterCount: 0,
          totalCount: 10,
          filteredEmails: [],
        })
      );

      const frame = lastFrame();
      expect(frame).toContain('No matches found');
      expect(frame).not.toContain('No emails');
    });

    it('should show "No emails" when there are no emails and no filter active', () => {
      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails: [],
          selectedIndex: 0,
          onSelect: vi.fn(),
        })
      );

      const frame = lastFrame();
      expect(frame).toContain('No emails');
    });
  });
});
