/**
 * End-to-end tests for US1 - Browse and Filter Inbox
 *
 * Tests the complete flow: auth → sync → display emails → sort → filter
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EmailRepository } from '../../src/core/services/email-repository.js';
import { EmailSorter } from '../../src/core/services/email-sorter.js';
import { EmailFilter } from '../../src/core/services/email-filter.js';
import Database from 'better-sqlite3';
import type { Email } from '../../src/core/models/email.js';

describe('US1: Browse and Filter Inbox - E2E', () => {
  let db: Database.Database;
  let emailRepository: EmailRepository;
  let emailSorter: EmailSorter;
  let emailFilter: EmailFilter;

  const testEmails: Email[] = [
    {
      id: 'email-1',
      threadId: 'thread-1',
      subject: 'Important: Project Update',
      sender: { name: 'Manager', email: 'manager@company.com' },
      recipients: [{ name: 'Team', email: 'team@company.com' }],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-03T10:00:00Z'),
      body: { text: 'Please review the attached updates', html: undefined },
      labels: ['INBOX', 'IMPORTANT', 'UNREAD'],
      isRead: false,
      category: 'updates',
      snippet: 'Please review',
      historyId: 'h1',
      syncedAt: new Date(),
    },
    {
      id: 'email-2',
      threadId: 'thread-2',
      subject: 'Weekend Plans',
      sender: { name: 'Friend', email: 'friend@personal.com' },
      recipients: [{ name: 'Me', email: 'me@example.com' }],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-02T14:00:00Z'),
      body: { text: 'Let hang out this weekend', html: undefined },
      labels: ['INBOX'],
      isRead: true,
      category: 'social',
      snippet: 'Let hang out',
      historyId: 'h2',
      syncedAt: new Date(),
    },
    {
      id: 'email-3',
      threadId: 'thread-3',
      subject: 'Newsletter: Tech News',
      sender: { name: 'Tech Daily', email: 'news@techdaily.com' },
      recipients: [{ name: 'Subscriber', email: 'sub@example.com' }],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-01T09:00:00Z'),
      body: { text: 'Today tech headlines...', html: undefined },
      labels: ['INBOX', 'UNREAD'],
      isRead: false,
      category: 'promotions',
      snippet: 'Today tech headlines',
      historyId: 'h3',
      syncedAt: new Date(),
    },
  ];

  beforeAll(() => {
    db = new Database(':memory:');

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        sender_name TEXT,
        sender_email TEXT NOT NULL,
        recipients TEXT,
        cc TEXT,
        bcc TEXT,
        date_received INTEGER NOT NULL,
        body_text TEXT,
        body_html TEXT,
        labels TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        snippet TEXT,
        history_id TEXT,
        synced_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_emails_date_received ON emails(date_received DESC);
      CREATE INDEX IF NOT EXISTS idx_emails_sender_email ON emails(sender_email);
      CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
    `);

    emailRepository = new EmailRepository(db);
    emailSorter = new EmailSorter();
    emailFilter = new EmailFilter();
  });

  afterAll(() => {
    db.close();
  });

  describe('Complete flow: sync → display → sort → filter', () => {
    it('should complete the full email browsing flow', async () => {
      // Step 1: Sync (simulate by loading emails into database)
      for (const email of testEmails) {
        await emailRepository.save(email);
      }

      // Step 2: Display emails
      const result = await emailRepository.list({ page: 1, pageSize: 10 });
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);

      // Step 3: Sort by date descending (default)
      const sortedByDateDesc = emailSorter.sortByDate(result.items, 'desc');
      expect(sortedByDateDesc[0].id).toBe('email-1'); // Most recent
      expect(sortedByDateDesc[2].id).toBe('email-3'); // Oldest

      // Step 4: Sort by date ascending
      const sortedByDateAsc = emailSorter.sortByDate(result.items, 'asc');
      expect(sortedByDateAsc[0].id).toBe('email-3'); // Oldest first
      expect(sortedByDateAsc[2].id).toBe('email-1'); // Most recent last

      // Step 5: Sort by sender
      const sortedBySender = emailSorter.sortBySender(result.items, 'asc');
      expect(sortedBySender[0].sender.email).toBe('friend@personal.com');
      expect(sortedBySender[2].sender.email).toBe('news@techdaily.com');

      // Step 6: Filter by unread
      const unreadEmails = emailFilter.filterByReadStatus(result.items, false);
      expect(unreadEmails).toHaveLength(2);
      expect(unreadEmails.every((e) => !e.isRead)).toBe(true);

      // Step 7: Filter by sender
      const workEmails = emailFilter.filterBySender(result.items, 'manager@company.com');
      expect(workEmails).toHaveLength(1);
      expect(workEmails[0].subject).toBe('Important: Project Update');

      // Step 8: Combine filters (unread + work sender)
      const combined = emailFilter.combine(result.items, [
        (emails) => emailFilter.filterByReadStatus(emails, false),
        (emails) => emailFilter.filterByLabel(emails, 'IMPORTANT'),
      ]);
      expect(combined).toHaveLength(1);
      expect(combined[0].id).toBe('email-1');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty inbox gracefully', async () => {
      // Clear database
      db.exec('DELETE FROM emails');

      const result = await emailRepository.list({ page: 1, pageSize: 10 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      // Clear and add emails
      db.exec('DELETE FROM emails');
      for (const email of testEmails) {
        await emailRepository.save(email);
      }

      // First page
      const page1 = await emailRepository.list({ page: 1, pageSize: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(3);

      // Second page
      const page2 = await emailRepository.list({ page: 2, pageSize: 2 });
      expect(page2.items).toHaveLength(1);
      expect(page2.total).toBe(3);
    });
  });

  describe('Visual distinction for unread emails', () => {
    it('should identify unread emails correctly', async () => {
      const result = await emailRepository.list({ page: 1, pageSize: 10 });
      const unreadEmails = result.items.filter((e) => !e.isRead);

      expect(unreadEmails).toHaveLength(2);
      expect(unreadEmails.map((e) => e.id)).toEqual(expect.arrayContaining(['email-1', 'email-3']));
    });
  });

  describe('Sort preferences persistence', () => {
    it('should maintain sort state across operations', async () => {
      // This would test that sort preferences persist
      // For now, verify that sort is deterministic
      const result = await emailRepository.list({ page: 1, pageSize: 10 });

      const sorted1 = emailSorter.sortByDate(result.items, 'desc');
      const sorted2 = emailSorter.sortByDate(result.items, 'desc');

      expect(sorted1.map((e) => e.id)).toEqual(sorted2.map((e) => e.id));
    });
  });
});
