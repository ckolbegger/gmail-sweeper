/**
 * Unit tests for EmailList filter mode
 *
 * T023: Tests for filter display in EmailList component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { EmailList } from '@/cli/components/email-list.js';
import type { Email } from '@/core/models/email.js';

// Mock email factory
function createMockEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'test@example.com' },
    recipients: [],
    dateReceived: new Date('2024-01-15T10:00:00Z'),
    isRead: true,
    isStarred: false,
    labels: [],
    ...overrides,
  };
}

describe('EmailList filter mode', () => {
  afterEach(() => {
    cleanup();
  });

  describe('filter count display (FR-009)', () => {
    it('displays "Filtered: X/Y emails" when filterCount and totalCount provided', () => {
      const emails = [
        createMockEmail({ id: 'email-1' }),
        createMockEmail({ id: 'email-2' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          filterCount={2}
          totalCount={10}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Filtered: 2/10 emails');
    });

    it('does not display filter count when filterCount is undefined', () => {
      const emails = [createMockEmail()];

      const { lastFrame } = render(
        <EmailList emails={emails} />
      );

      const output = lastFrame();
      expect(output).not.toContain('Filtered:');
    });

    it('displays correct count when all emails match filter', () => {
      const emails = [
        createMockEmail({ id: 'email-1' }),
        createMockEmail({ id: 'email-2' }),
        createMockEmail({ id: 'email-3' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          filterCount={3}
          totalCount={3}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Filtered: 3/3 emails');
    });

    it('displays correct count when no emails match filter', () => {
      const emails: Email[] = [];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          filterCount={0}
          totalCount={5}
        />
      );

      const output = lastFrame();
      expect(output).toContain('Filtered: 0/5 emails');
    });
  });

  describe('no matches found (FR-005, acceptance scenario 4)', () => {
    it('shows "No matches found" when filter is active and no emails match', () => {
      const emails: Email[] = [];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          filterCount={0}
          totalCount={10}
        />
      );

      const output = lastFrame();
      expect(output).toContain('No matches found');
    });

    it('shows "No emails found" when no filter and no emails', () => {
      const emails: Email[] = [];

      const { lastFrame } = render(
        <EmailList emails={emails} />
      );

      const output = lastFrame();
      expect(output).toContain('No emails found');
      expect(output).not.toContain('No matches found');
    });

    it('does not show "No matches found" when emails exist', () => {
      const emails = [createMockEmail()];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          filterCount={1}
          totalCount={5}
        />
      );

      const output = lastFrame();
      expect(output).not.toContain('No matches found');
    });
  });

  describe('shows only matching emails', () => {
    it('displays only filtered emails passed to component', () => {
      const emails = [
        createMockEmail({ id: 'email-1', subject: 'Matching Email 1' }),
        createMockEmail({ id: 'email-2', subject: 'Matching Email 2' }),
      ];

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          filterCount={2}
          totalCount={10}
        />
      );

      const output = lastFrame();
      // Should show the filtered emails
      expect(output).toContain('Matching Email 1');
      expect(output).toContain('Matching Email 2');
    });
  });
});
