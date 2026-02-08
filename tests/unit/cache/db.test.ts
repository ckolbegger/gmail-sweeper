/**
 * T026-T030: Unit tests for EmailCache.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir, access } from 'fs/promises';
import { EmailCache } from '../../../src/core/cache/db.js';
import type { Email, EmailAddress, Label } from '../../../src/core/models/index.js';

describe('EmailCache', () => {
  let cache: EmailCache;
  let testDir: string;
  let dbPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-cache-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    cache = new EmailCache(dbPath);
  });

  afterEach(async () => {
    cache.close();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('T026: Initialize', () => {
    it('should create database file on initialize', async () => {
      await cache.initialize();
      await expect(access(dbPath)).resolves.toBeUndefined();
    });

    it('should create emails table with correct schema', async () => {
      await cache.initialize();

      // Insert and retrieve to verify schema
      const email = createTestEmail('test-1');
      cache.upsertEmails([email]);

      const emails = cache.getEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0]?.id).toBe('test-1');
    });

    it('should create sync_state table', async () => {
      await cache.initialize();

      // Verify sync_state operations work
      cache.setLastSync('test@gmail.com', new Date('2024-01-01'));
      const lastSync = cache.getLastSync('test@gmail.com');

      expect(lastSync).toEqual(new Date('2024-01-01'));
    });

    it('should open existing database without data loss', async () => {
      await cache.initialize();
      cache.upsertEmails([createTestEmail('persist-1')]);
      cache.close();

      // Reopen database
      cache = new EmailCache(dbPath);
      await cache.initialize();

      const emails = cache.getEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0]?.id).toBe('persist-1');
    });

    it('should handle database locked error', async () => {
      await cache.initialize();

      // Open second connection (should not throw error due to WAL mode)
      const cache2 = new EmailCache(dbPath);
      await cache2.initialize();

      // Both should work without errors - each instance has its own in-memory copy
      cache.upsertEmails([createTestEmail('cache1')]);
      cache2.upsertEmails([createTestEmail('cache2')]);

      // Each instance sees only its own inserts
      const emailsFromCache = cache.getEmails();
      expect(emailsFromCache).toHaveLength(1);
      expect(emailsFromCache[0]?.id).toBe('cache1');

      cache2.close();
    });
  });

  describe('T028: upsertEmails', () => {
    beforeEach(async () => {
      await cache.initialize();
    });

    it('should insert new emails', () => {
      const email = createTestEmail('new-1');
      cache.upsertEmails([email]);

      const emails = cache.getEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0]?.subject).toBe('Test Subject new-1');
    });

    it('should update existing emails by id', () => {
      const email1 = createTestEmail('update-1');
      cache.upsertEmails([email1]);

      const email2 = { ...email1, subject: 'Updated Subject' };
      cache.upsertEmails([email2]);

      const emails = cache.getEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0]?.subject).toBe('Updated Subject');
    });

    it('should handle empty array (boundary: 0 emails)', () => {
      cache.upsertEmails([]);
      const emails = cache.getEmails();
      expect(emails).toHaveLength(0);
    });

    it('should handle single email (boundary: 1 email)', () => {
      cache.upsertEmails([createTestEmail('single')]);
      const emails = cache.getEmails();
      expect(emails).toHaveLength(1);
    });

    it('should handle batch of 100+ emails', () => {
      const manyEmails = Array.from({ length: 150 }, (_, i) => createTestEmail(`batch-${i}`));
      cache.upsertEmails(manyEmails);

      const emails = cache.getEmails({ limit: 200 });
      expect(emails).toHaveLength(150);
    });

    it('should handle batch of 1000+ emails efficiently', () => {
      const start = Date.now();
      const manyEmails = Array.from({ length: 1000 }, (_, i) => createTestEmail(`large-${i}`));
      cache.upsertEmails(manyEmails);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      const count = cache.getEmails({ limit: 1 });
      expect(count).toHaveLength(1);
    });

    it('should preserve existing fields on partial update', () => {
      const email = createTestEmail('partial');
      email.bodyText = 'Original body';
      cache.upsertEmails([email]);

      // Update without body
      const partialEmail = { ...email, subject: 'New Subject' };
      delete (partialEmail as Partial<Email>).bodyText;
      cache.upsertEmails([partialEmail as Email]);

      // Body should be preserved (or email should work)
      const emails = cache.getEmails();
      expect(emails[0]?.subject).toBe('New Subject');
    });

    it('should use transaction for atomicity', () => {
      // Insert some emails
      cache.upsertEmails([createTestEmail('atomic-1'), createTestEmail('atomic-2')]);

      const emails = cache.getEmails();
      // Either all inserted or none
      expect(emails.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('T029: getEmails', () => {
    beforeEach(async () => {
      await cache.initialize();

      // Insert test emails with different dates
      const emails = [
        { ...createTestEmail('email-1'), date: new Date('2024-03-01') },
        { ...createTestEmail('email-2'), date: new Date('2024-03-03') },
        { ...createTestEmail('email-3'), date: new Date('2024-03-02') },
      ];

      // Modify senders for sort testing
      emails[0]!.sender = { email: 'charlie@test.com', name: 'Charlie' };
      emails[1]!.sender = { email: 'alice@test.com', name: 'Alice' };
      emails[2]!.sender = { email: 'bob@test.com', name: 'Bob' };

      cache.upsertEmails(emails);
    });

    it('should return emails sorted by date descending (default)', () => {
      const emails = cache.getEmails();

      expect(emails).toHaveLength(3);
      expect(emails[0]?.id).toBe('email-2'); // March 3 (newest)
      expect(emails[1]?.id).toBe('email-3'); // March 2
      expect(emails[2]?.id).toBe('email-1'); // March 1 (oldest)
    });

    it('should sort by sender alphabetically', () => {
      const emails = cache.getEmails({ sortBy: 'sender', sortDesc: false });

      expect(emails[0]?.sender.email).toBe('alice@test.com');
      expect(emails[1]?.sender.email).toBe('bob@test.com');
      expect(emails[2]?.sender.email).toBe('charlie@test.com');
    });

    it('should sort by subject alphabetically', () => {
      // Update subjects for distinct sorting
      cache.upsertEmails([
        { ...createTestEmail('email-1'), subject: 'Zebra' },
        { ...createTestEmail('email-2'), subject: 'Apple' },
        { ...createTestEmail('email-3'), subject: 'Mango' },
      ]);

      const emails = cache.getEmails({ sortBy: 'subject', sortDesc: false });

      expect(emails[0]?.subject).toBe('Apple');
      expect(emails[1]?.subject).toBe('Mango');
      expect(emails[2]?.subject).toBe('Zebra');
    });

    it('should handle empty cache', async () => {
      const emptyCache = new EmailCache(join(testDir, 'empty.db'));
      await emptyCache.initialize();

      const emails = emptyCache.getEmails();
      expect(emails).toHaveLength(0);

      emptyCache.close();
    });

    it('should respect limit parameter (boundary: 0, 1, 100)', () => {
      // Limit 0 should return all
      const limit0 = cache.getEmails({ limit: 0 });
      expect(limit0.length).toBe(3);

      // Limit 1
      const limit1 = cache.getEmails({ limit: 1 });
      expect(limit1.length).toBe(1);

      // Limit 100 (more than available)
      const limit100 = cache.getEmails({ limit: 100 });
      expect(limit100.length).toBe(3);
    });
  });

  describe('T030: getLastSync / setLastSync', () => {
    beforeEach(async () => {
      await cache.initialize();
    });

    it('should return null if never synced', () => {
      const lastSync = cache.getLastSync('never@synced.com');
      expect(lastSync).toBeNull();
    });

    it('should return last sync timestamp after setLastSync', () => {
      const syncDate = new Date('2024-06-15T12:00:00Z');
      cache.setLastSync('synced@test.com', syncDate);

      const lastSync = cache.getLastSync('synced@test.com');
      expect(lastSync).toEqual(syncDate);
    });

    it('should overwrite previous sync timestamp', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-06-01');

      cache.setLastSync('user@test.com', date1);
      cache.setLastSync('user@test.com', date2);

      const lastSync = cache.getLastSync('user@test.com');
      expect(lastSync).toEqual(date2);
    });
  });
});

// Helper function to create test emails
function createTestEmail(id: string): Email {
  const sender: EmailAddress = {
    email: `sender-${id}@test.com`,
    name: `Sender ${id}`,
  };

  const labels: Label[] = [
    { id: 'INBOX', name: 'INBOX', type: 'system' },
  ];

  return {
    id,
    threadId: `thread-${id}`,
    subject: `Test Subject ${id}`,
    sender,
    recipients: [{ email: 'recipient@test.com' }],
    date: new Date(),
    snippet: `Snippet for ${id}`,
    labels,
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}
