/**
 * Integration tests for email listing flow
 *
 * TDD: Tests must FAIL before implementation
 *
 * Tests:
 * - it should list emails from database
 * - it should handle empty list state
 * - it should filter emails by sender
 * - it should sort emails by date descending
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { EmailRepository } from '../../src/core/services/email-repository.js';
import { EmailSorter } from '../../src/core/services/email-sorter.js';
import { EmailFilter } from '../../src/core/services/email-filter.js';
import type { Email } from '../../src/core/models/email.js';

describe('Email Listing Integration', () => {
  let db: Database.Database;
  let emailRepository: EmailRepository;
  let emailSorter: EmailSorter;
  let emailFilter: EmailFilter;

  const testEmails: Email[] = [
    {
      id: 'email-1',
      threadId: 'thread-1',
      subject: 'Oldest Email',
      sender: { name: 'Alice', email: 'alice@example.com' },
      recipients: [{ name: 'Bob', email: 'bob@example.com' }],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-01T10:00:00Z'),
      body: { text: 'Body 1', html: undefined },
      labels: ['INBOX', 'UNREAD'],
      isRead: false,
      category: 'updates',
      snippet: 'Snippet 1',
      historyId: 'history-1',
      syncedAt: new Date(),
    },
    {
      id: 'email-2',
      threadId: 'thread-2',
      subject: 'Middle Email',
      sender: { name: 'Charlie', email: 'charlie@example.com' },
      recipients: [{ name: 'Bob', email: 'bob@example.com' }],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-02T12:00:00Z'),
      body: { text: 'Body 2', html: undefined },
      labels: ['INBOX'],
      isRead: true,
      category: 'social',
      snippet: 'Snippet 2',
      historyId: 'history-2',
      syncedAt: new Date(),
    },
    {
      id: 'email-3',
      threadId: 'thread-3',
      subject: 'Newest Email',
      sender: { name: 'Alice', email: 'alice@example.com' },
      recipients: [{ name: 'Bob', email: 'bob@example.com' }],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-03T14:00:00Z'),
      body: { text: 'Body 3', html: undefined },
      labels: ['INBOX', 'UNREAD'],
      isRead: false,
      category: 'promotions',
      snippet: 'Snippet 3',
      historyId: 'history-3',
      syncedAt: new Date(),
    },
  ];

  beforeAll(() => {
    db = new Database(':memory:');
    emailRepository = new EmailRepository(db);
    emailSorter = new EmailSorter();
    emailFilter = new EmailFilter();

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
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(async () => {
    // Clear and repopulate database
    db.exec('DELETE FROM emails');
    for (const email of testEmails) {
      await emailRepository.save(email);
    }
  });

  describe('email listing', () => {
    it('should list emails from database', async () => {
      const result = await emailRepository.list({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should handle empty list state', async () => {
      db.exec('DELETE FROM emails');

      const result = await emailRepository.list({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('email filtering', () => {
    it('should filter emails by sender', async () => {
      const result = await emailRepository.list({ page: 1, pageSize: 10 });
      const filtered = emailFilter.filterBySender(result.items, 'alice@example.com');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.sender.email === 'alice@example.com')).toBe(true);
    });

    it('should filter by read/unread status', async () => {
      const result = await emailRepository.list({ page: 1, pageSize: 10 });
      const unread = emailFilter.filterByReadStatus(result.items, false);

      expect(unread).toHaveLength(2);
      expect(unread.every(e => e.isRead === false)).toBe(true);
    });
  });

  describe('email sorting', () => {
    it('should sort emails by date descending', async () => {
      const result = await emailRepository.list({ page: 1, pageSize: 10 });
      const sorted = emailSorter.sortByDate(result.items, 'desc');

      expect(sorted[0].id).toBe('email-3');
      expect(sorted[1].id).toBe('email-2');
      expect(sorted[2].id).toBe('email-1');
    });

    it('should sort emails by date ascending', async () => {
      const result = await emailRepository.list({ page: 1, pageSize: 10 });
      const sorted = emailSorter.sortByDate(result.items, 'asc');

      expect(sorted[0].id).toBe('email-1');
      expect(sorted[1].id).toBe('email-2');
      expect(sorted[2].id).toBe('email-3');
    });
  });
});
