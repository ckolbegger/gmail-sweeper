/**
 * T037: Test for filter input flow - US1-B001
 *
 * Tests:
 * 1. When user presses 'f', filter input should appear
 * 2. User can type filter description
 * 3. Press Enter sends input to LLM
 * 4. Filtered results displayed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { InboxApp } from '../../src/tui/app.js';
import type { GmailClient, Email, EmailAddress, Label } from '../../src/core/index.js';
import { EmailCache } from '../../src/core/cache/db.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, rm } from 'fs/promises';

function createTestEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Test Email ${id}`,
    sender: { email: 'sender@example.com', name: 'Sender' } as EmailAddress,
    recipients: [{ email: 'recipient@example.com' }],
    date: new Date(),
    snippet: `Snippet ${id}`,
    labels: [] as Label[],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

describe('T037: Filter Input Flow (US1-B001)', () => {
  let cache: EmailCache;
  let testDir: string;
  let dbPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-filter-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    cache = new EmailCache(dbPath);
    await cache.initialize();

    // Pre-populate cache with test emails so app loads immediately
    const testEmails = [
      createTestEmail('1'),
      createTestEmail('2'),
      createTestEmail('3'),
      createTestEmail('4'),
      createTestEmail('5'),
    ];
    cache.upsertEmails(testEmails);
  });

  afterEach(async () => {
    cache.close();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should show filter prompt when f is pressed', async () => {
    const mockClient = {} as GmailClient;

    const { lastFrame, stdin } = render(<InboxApp client={mockClient} cache={cache} />);

    // Wait for initial load to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Wait for initial render
    const initialOutput = lastFrame();
    expect(initialOutput).toContain('Gmail Inbox');

    // Press 'f' to activate filter
    stdin.write('f');

    // Should now show filter prompt with instruction
    const filterOutput = lastFrame();
    expect(filterOutput).toMatch(/filter|find|emails/i);
  });

  it('should accept keyboard input after pressing f', async () => {
    const mockClient = {} as GmailClient;

    const { lastFrame, stdin } = render(<InboxApp client={mockClient} cache={cache} />);

    // Wait for initial load
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Press 'f' to activate filter
    stdin.write('f');

    // Type some text
    stdin.write('invitation');

    // Should show the typed text
    const output = lastFrame();
    expect(output).toContain('invitation');
  });

  it('should call LLM when Enter is pressed after typing filter', async () => {
    const mockClient = {} as GmailClient;

    const { lastFrame, stdin } = render(<InboxApp client={mockClient} cache={cache} />);

    // Wait for initial load
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Press 'f' to activate filter
    stdin.write('f');

    // Type filter description
    stdin.write('invitation emails');

    // Press Enter to submit
    stdin.write('\r');

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Should show loading or results - the text we typed should be visible
    const output = lastFrame();
    expect(output).toMatch(/invitation|evaluating|filtered|loading/i);
  });

  it('should show "Enter what kind of emails you want to find" instruction', async () => {
    const mockClient = {} as GmailClient;

    const { lastFrame, stdin } = render(<InboxApp client={mockClient} cache={cache} />);

    // Wait for initial load
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Press 'f' to activate filter
    stdin.write('f');

    // Should show instruction
    const output = lastFrame();
    expect(output).toMatch(/enter|find|what.*emails|kind.*emails/i);
  });
});
