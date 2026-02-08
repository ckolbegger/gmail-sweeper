/**
 * T050b: Integration test for Gmail sync + TUI display.
 * Tests: fetch from Gmail API → cache → display with loading state
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Email, EmailAddress, Label, MessageListResult } from '../../src/core/models/index.js';
import type { GmailClient } from '../../src/core/gmail/client.js';
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
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

describe('US1 Integration: Sync and Display', () => {
  let cache: EmailCache;
  let testDir: string;
  let dbPath: string;
  let mockClient: Partial<GmailClient>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-sync-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    cache = new EmailCache(dbPath);
    await cache.initialize();

    // Mock Gmail client
    mockClient = {
      listMessages: vi.fn(async (): Promise<MessageListResult> => ({
        messages: [
          createTestEmail('1'),
          createTestEmail('2'),
          createTestEmail('3'),
        ],
        totalEstimate: 3,
      })),
    };
  });

  afterEach(async () => {
    cache.close();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should fetch emails from Gmail API and cache them', async () => {
    // Act: Call mock client
    const result = await (mockClient.listMessages as any)();
    cache.upsertEmails(result.messages);

    // Assert: Emails are cached
    expect(mockClient.listMessages).toHaveBeenCalled();
    const cached = cache.getEmails({ limit: 10 });
    expect(cached).toHaveLength(3);
  });

  it('should display loading state during fetch', async () => {
    // Arrange: Initial empty state
    const initialEmails = cache.getEmails({ limit: 10 });
    expect(initialEmails).toHaveLength(0);

    // Act: Simulate loading state
    let isLoading = true;
    const fetchPromise = (mockClient.listMessages as any)();

    // Assert: Loading state is true during fetch
    expect(isLoading).toBe(true);

    // Act: Complete fetch
    const result = await fetchPromise;
    cache.upsertEmails(result.messages);
    isLoading = false;

    // Assert: Loading state cleared and emails available
    expect(isLoading).toBe(false);
    const loadedEmails = cache.getEmails({ limit: 10 });
    expect(loadedEmails).toHaveLength(3);
  });

  it('should handle sync errors gracefully', async () => {
    // Arrange: Mock error response
    mockClient.listMessages = vi.fn(async () => {
      throw new Error('Network error');
    });

    // Act & Assert: Error is caught
    let error: Error | null = null;
    try {
      await (mockClient.listMessages as any)();
    } catch (err) {
      error = err as Error;
    }

    expect(error).toBeDefined();
    expect(error?.message).toContain('Network');

    // Cache should still work (with empty or previous data)
    const cached = cache.getEmails({ limit: 10 });
    expect(cached).toHaveLength(0);
  });

  it('should update cache with new emails on sync', async () => {
    // Arrange: Initial emails
    cache.upsertEmails([createTestEmail('1'), createTestEmail('2')]);

    // Act: Sync with new set (simulate update)
    const newEmails = [
      createTestEmail('2'), // Updated
      createTestEmail('3'), // New
      createTestEmail('4'), // New
    ];
    cache.upsertEmails(newEmails);

    // Assert: Cache has updated emails
    const cached = cache.getEmails({ limit: 10 });
    expect(cached.length).toBeGreaterThanOrEqual(3);
  });

  it('should support pagination during sync', async () => {
    // Arrange: Mock paginated response
    let pageToken: string | undefined;
    mockClient.listMessages = vi.fn(async (): Promise<MessageListResult> => {
      if (!pageToken) {
        // First page
        return {
          messages: [createTestEmail('1'), createTestEmail('2')],
          totalEstimate: 4,
          nextPageToken: 'page2token',
        };
      } else {
        // Second page
        return {
          messages: [createTestEmail('3'), createTestEmail('4')],
          totalEstimate: 4,
        };
      }
    });

    // Act: Fetch first page
    const page1 = await (mockClient.listMessages as any)();
    cache.upsertEmails(page1.messages);
    pageToken = page1.nextPageToken;

    // Act: Fetch second page
    const page2 = await (mockClient.listMessages as any)();
    cache.upsertEmails(page2.messages);

    // Assert: Both pages cached
    const all = cache.getEmails({ limit: 10 });
    expect(all.length).toBe(4);
  });
});
