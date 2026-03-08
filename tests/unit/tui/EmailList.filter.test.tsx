/**
 * T023: Unit tests for EmailList filter mode.
 * Tests filter count display, filtered email rendering, and empty filter state.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import type { Email, EmailAddress, Label } from '../../../src/core/models/index.js';
import { EmailList } from '../../../src/tui/components/EmailList.js';

function createTestEmail(id: string, overrides?: Partial<Email>): Email {
  const sender: EmailAddress = {
    email: 'sender@example.com',
    name: 'Sender Name',
  };

  const labels: Label[] = [{ id: 'INBOX', name: 'INBOX', type: 'system' }];

  return {
    id,
    threadId: `thread-${id}`,
    subject: overrides?.subject ?? `Test Subject ${id}`,
    sender: overrides?.sender ?? sender,
    recipients: overrides?.recipients ?? [{ email: 'recipient@example.com' }],
    date: overrides?.date ?? new Date(),
    snippet: `Snippet for ${id}`,
    labels: overrides?.labels ?? labels,
    isRead: overrides?.isRead ?? false,
    isStarred: overrides?.isStarred ?? false,
    hasAttachments: overrides?.hasAttachments ?? false,
  };
}

describe('EmailList filter mode', () => {
  it('displays "Filtered: X/Y emails" when filterCount and totalCount are provided', () => {
    const emails = [
      createTestEmail('1', { subject: 'Meeting tomorrow' }),
      createTestEmail('2', { subject: 'Meeting notes' }),
    ];

    const { lastFrame } = render(
      <EmailList
        emails={emails}
        selectedIndex={0}
        filterCount={2}
        totalCount={10}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('Filtered: 2/10 emails');
  });

  it('shows only the emails passed in (filtering is done upstream)', () => {
    const emails = [
      createTestEmail('1', { subject: 'Matching Email A' }),
      createTestEmail('3', { subject: 'Matching Email C' }),
    ];

    const { lastFrame } = render(
      <EmailList
        emails={emails}
        selectedIndex={0}
        filterCount={2}
        totalCount={5}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('Matching Email A');
    expect(output).toContain('Matching Email C');
    // Should not contain emails not passed in
    expect(output).not.toContain('Matching Email B');
  });

  it('shows "No matches found" when filter is active but emails array is empty', () => {
    const { lastFrame } = render(
      <EmailList
        emails={[]}
        selectedIndex={-1}
        filterCount={0}
        totalCount={10}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('No matches found');
    // Should NOT show the default empty message
    expect(output).not.toContain('No emails in inbox');
  });

  it('shows default "No emails in inbox" when filter is NOT active and emails is empty', () => {
    const { lastFrame } = render(
      <EmailList
        emails={[]}
        selectedIndex={-1}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('No emails in inbox');
    expect(output).not.toContain('No matches found');
  });
});
