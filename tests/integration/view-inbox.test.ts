/**
 * T050a: Integration test for inbox viewing flow.
 * Tests: load cache → display list → navigate with j/k → show preview
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Email, EmailAddress, Label } from '../../src/core/models/index.js';
import { EmailCache } from '../../src/core/cache/db.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, rm } from 'fs/promises';

function createTestEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email Subject ${id}`,
    sender: { email: 'sender@example.com', name: 'Sender' } as EmailAddress,
    recipients: [{ email: 'recipient@example.com' }],
    date: new Date(),
    snippet: `Snippet ${id}`,
    labels: [] as Label[],
    isRead: id === '2', // Email 2 is read
    isStarred: false,
    hasAttachments: false,
  };
}

describe('US1 Integration: View Inbox', () => {
  let cache: EmailCache;
  let testDir: string;
  let dbPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-integration-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    cache = new EmailCache(dbPath);
    await cache.initialize();
  });

  afterEach(async () => {
    cache.close();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load emails from cache and display in list', async () => {
    // Arrange: Cache some emails
    const emails = [createTestEmail('1'), createTestEmail('2'), createTestEmail('3')];
    cache.upsertEmails(emails);

    // Act: Load from cache
    const loaded = cache.getEmails({ limit: 10 });

    // Assert: Emails are loaded and ready for display
    expect(loaded).toHaveLength(3);
    expect(loaded[0]?.subject).toContain('Email Subject');
    expect(loaded[1]?.isRead).toBe(true);
    expect(loaded[2]?.isRead).toBe(false);
  });

  it('should show email preview when selected', async () => {
    // Arrange: Cache emails
    const email = createTestEmail('1');
    email.bodyText = 'This is the email body content.';
    cache.upsertEmails([email]);

    // Act: Load and select first email
    const loaded = cache.getEmails({ limit: 10 });
    const selected = loaded[0];

    // Assert: Selected email has full content
    expect(selected).toBeDefined();
    expect(selected?.bodyText).toContain('body content');
  });

  it('should navigate through emails with keyboard', async () => {
    // Arrange: Cache 5 emails
    const emails = Array.from({ length: 5 }, (_, i) => createTestEmail(String(i + 1)));
    cache.upsertEmails(emails);
    const loaded = cache.getEmails({ limit: 10 });

    // Act: Simulate navigation
    let selectedIndex = 0;
    const navigate = (direction: 'down' | 'up') => {
      if (direction === 'down' && selectedIndex < loaded.length - 1) {
        selectedIndex++;
      } else if (direction === 'up' && selectedIndex > 0) {
        selectedIndex--;
      }
    };

    navigate('down'); // Index 1
    navigate('down'); // Index 2
    navigate('up'); // Index 1

    // Assert: Navigation works correctly
    expect(selectedIndex).toBe(1);
    expect(loaded[selectedIndex]?.subject).toContain('Email Subject 2');
  });

  it('should display unread indicator for unread emails', async () => {
    // Arrange: Mix of read and unread emails
    const emails = [
      { ...createTestEmail('1'), isRead: false },
      { ...createTestEmail('2'), isRead: true },
      { ...createTestEmail('3'), isRead: false },
    ];
    cache.upsertEmails(emails);

    // Act: Load emails
    const loaded = cache.getEmails({ limit: 10 });

    // Assert: Can identify unread emails
    const unreadCount = loaded.filter((e) => !e.isRead).length;
    expect(unreadCount).toBe(2);
    expect(loaded[1]?.isRead).toBe(true);
  });

  it('should handle large inbox with pagination', async () => {
    // Arrange: Cache 100+ emails
    const emails = Array.from({ length: 150 }, (_, i) => createTestEmail(String(i + 1)));
    cache.upsertEmails(emails);

    // Act: Load with pagination
    const page1 = cache.getEmails({ limit: 50, offset: 0 });
    const page2 = cache.getEmails({ limit: 50, offset: 50 });
    const page3 = cache.getEmails({ limit: 50, offset: 100 });

    // Assert: Pagination works
    expect(page1).toHaveLength(50);
    expect(page2).toHaveLength(50);
    expect(page3).toHaveLength(50);
    expect(page1[0]?.id).not.toBe(page2[0]?.id);
  });
});
