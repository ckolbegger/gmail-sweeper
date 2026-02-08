import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppDatabase } from '../../../src/core/persistence/database.js';
import { EmailRepository } from '../../../src/core/services/email-repository.js';
import { DatabaseError } from '../../../src/core/errors/index.js';
import type { Email, EmailAddress } from '../../../src/core/contracts/types.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('EmailRepository', () => {
  let tempDir: string;
  let dbPath: string;
  let db: AppDatabase;
  let repository: EmailRepository;

  // Test data factory
  const createTestEmail = (overrides: Partial<Email> = {}): Email => ({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    threadId: 'thread_123',
    subject: 'Test Email Subject',
    sender: { name: 'John Doe', email: 'john@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-15T10:30:00Z'),
    body: { text: 'Hello, this is a test email body.' },
    labels: ['INBOX', 'UNREAD'],
    isRead: false,
    snippet: 'Hello, this is a test...',
    historyId: 'history_123',
    syncedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gmail-sweep-test-'));
    dbPath = join(tempDir, 'test.db');
    db = new AppDatabase({ path: dbPath });
    await db.initialize();
    repository = new EmailRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('save', () => {
    it('should save email to database', async () => {
      const email = createTestEmail();

      await repository.save(email);

      const saved = await repository.getById(email.id);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe(email.id);
      expect(saved?.subject).toBe(email.subject);
      expect(saved?.sender.email).toBe(email.sender.email);
    });

    it('should save email with all fields', async () => {
      const sender: EmailAddress = { name: 'Jane Smith', email: 'jane@example.com' };
      const recipient: EmailAddress = { name: 'Bob Jones', email: 'bob@example.com' };
      const cc: EmailAddress = { email: 'cc@example.com' };
      const email = createTestEmail({
        subject: 'Complete Email Test',
        sender,
        recipients: [recipient],
        cc: [cc],
        bcc: [{ email: 'bcc@example.com' }],
        body: { text: 'Plain text body', html: '<p>HTML body</p>' },
        labels: ['INBOX', 'IMPORTANT', 'CATEGORY_PERSONAL'],
        isRead: true,
        category: 'primary',
      });

      await repository.save(email);

      const saved = await repository.getById(email.id);
      expect(saved).not.toBeNull();
      expect(saved?.subject).toBe('Complete Email Test');
      expect(saved?.sender).toEqual(sender);
      expect(saved?.recipients).toEqual([recipient]);
      expect(saved?.cc).toEqual([cc]);
      expect(saved?.body.text).toBe('Plain text body');
      expect(saved?.body.html).toBe('<p>HTML body</p>');
      expect(saved?.labels).toContain('IMPORTANT');
      expect(saved?.isRead).toBe(true);
      expect(saved?.category).toBe('primary');
    });

    it('should update existing email on duplicate id', async () => {
      const email = createTestEmail({ id: 'duplicate_test' });
      await repository.save(email);

      const updatedEmail = createTestEmail({
        id: 'duplicate_test',
        subject: 'Updated Subject',
        isRead: true,
      });
      await repository.save(updatedEmail);

      const saved = await repository.getById('duplicate_test');
      expect(saved?.subject).toBe('Updated Subject');
      expect(saved?.isRead).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      db.close();

      const email = createTestEmail();

      await expect(repository.save(email)).rejects.toThrow(DatabaseError);
    });
  });

  describe('getById', () => {
    it('should retrieve email by ID', async () => {
      const email = createTestEmail({ id: 'retrieve_test' });
      await repository.save(email);

      const retrieved = await repository.getById('retrieve_test');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('retrieve_test');
      expect(retrieved?.subject).toBe(email.subject);
    });

    it('should return null for non-existent email', async () => {
      const result = await repository.getById('non_existent_id');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      db.close();

      await expect(repository.getById('any_id')).rejects.toThrow(DatabaseError);
    });
  });

  describe('list', () => {
    it('should list emails with pagination', async () => {
      // Create 5 test emails
      for (let i = 0; i < 5; i++) {
        await repository.save(createTestEmail({
          id: `list_test_${i}`,
          subject: `Email ${i}`,
          dateReceived: new Date(2024, 0, 15, 10, i, 0),
        }));
      }

      const result = await repository.list({ limit: 3, offset: 0 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should return correct page with offset', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.save(createTestEmail({
          id: `page_test_${i}`,
          subject: `Email ${i}`,
        }));
      }

      const result = await repository.list({ limit: 2, offset: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.offset).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should return hasMore false on last page', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.save(createTestEmail({
          id: `last_page_${i}`,
          subject: `Email ${i}`,
        }));
      }

      const result = await repository.list({ limit: 3, offset: 3 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should return empty array when no emails', async () => {
      const result = await repository.list({ limit: 10, offset: 0 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should support sorting by date', async () => {
      await repository.save(createTestEmail({
        id: 'sort_old',
        subject: 'Old Email',
        dateReceived: new Date('2024-01-10'),
      }));
      await repository.save(createTestEmail({
        id: 'sort_new',
        subject: 'New Email',
        dateReceived: new Date('2024-01-20'),
      }));

      const result = await repository.list({
        limit: 10,
        offset: 0,
        sort: { field: 'date', direction: 'desc' },
      });

      expect(result.items[0].subject).toBe('New Email');
      expect(result.items[1].subject).toBe('Old Email');
    });

    it('should support filtering by read status', async () => {
      await repository.save(createTestEmail({
        id: 'read_email',
        subject: 'Read Email',
        isRead: true,
      }));
      await repository.save(createTestEmail({
        id: 'unread_email',
        subject: 'Unread Email',
        isRead: false,
      }));

      const result = await repository.list({
        limit: 10,
        offset: 0,
        filter: { isRead: false },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].subject).toBe('Unread Email');
    });

    it('should support filtering by sender', async () => {
      await repository.save(createTestEmail({
        id: 'from_alice',
        subject: 'From Alice',
        sender: { email: 'alice@example.com' },
      }));
      await repository.save(createTestEmail({
        id: 'from_bob',
        subject: 'From Bob',
        sender: { email: 'bob@example.com' },
      }));

      const result = await repository.list({
        limit: 10,
        offset: 0,
        filter: { sender: 'alice@example.com' },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].subject).toBe('From Alice');
    });

    it('should support filtering by date range', async () => {
      await repository.save(createTestEmail({
        id: 'jan_email',
        subject: 'January Email',
        dateReceived: new Date('2024-01-15'),
      }));
      await repository.save(createTestEmail({
        id: 'feb_email',
        subject: 'February Email',
        dateReceived: new Date('2024-02-15'),
      }));

      const result = await repository.list({
        limit: 10,
        offset: 0,
        filter: {
          dateFrom: new Date('2024-02-01'),
          dateTo: new Date('2024-02-28'),
        },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].subject).toBe('February Email');
    });

    it('should support filtering by label', async () => {
      await repository.save(createTestEmail({
        id: 'important_email',
        subject: 'Important Email',
        labels: ['INBOX', 'IMPORTANT'],
      }));
      await repository.save(createTestEmail({
        id: 'normal_email',
        subject: 'Normal Email',
        labels: ['INBOX'],
      }));

      const result = await repository.list({
        limit: 10,
        offset: 0,
        filter: { labels: ['IMPORTANT'] },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].subject).toBe('Important Email');
    });

    it('should combine multiple filters with AND logic', async () => {
      await repository.save(createTestEmail({
        id: 'match_both',
        subject: 'Match Both',
        sender: { email: 'alice@example.com' },
        isRead: false,
        labels: ['INBOX'],
      }));
      await repository.save(createTestEmail({
        id: 'match_sender_only',
        subject: 'Match Sender Only',
        sender: { email: 'alice@example.com' },
        isRead: true,
        labels: ['INBOX'],
      }));
      await repository.save(createTestEmail({
        id: 'match_read_only',
        subject: 'Match Read Only',
        sender: { email: 'bob@example.com' },
        isRead: false,
        labels: ['INBOX'],
      }));

      const result = await repository.list({
        limit: 10,
        offset: 0,
        filter: {
          sender: 'alice@example.com',
          isRead: false,
        },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].subject).toBe('Match Both');
    });

    it('should handle database errors gracefully', async () => {
      db.close();

      await expect(repository.list({ limit: 10, offset: 0 })).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateReadStatus', () => {
    it('should update email read status', async () => {
      const email = createTestEmail({ id: 'read_status_test', isRead: false });
      await repository.save(email);

      await repository.updateReadStatus('read_status_test', true);

      const updated = await repository.getById('read_status_test');
      expect(updated?.isRead).toBe(true);
    });

    it('should update email to unread', async () => {
      const email = createTestEmail({ id: 'unread_status_test', isRead: true });
      await repository.save(email);

      await repository.updateReadStatus('unread_status_test', false);

      const updated = await repository.getById('unread_status_test');
      expect(updated?.isRead).toBe(false);
    });

    it('should throw error for non-existent email', async () => {
      await expect(repository.updateReadStatus('non_existent', true)).rejects.toThrow(DatabaseError);
    });

    it('should handle database errors gracefully', async () => {
      db.close();

      await expect(repository.updateReadStatus('any_id', true)).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('should delete email from database', async () => {
      const email = createTestEmail({ id: 'delete_test' });
      await repository.save(email);

      await repository.delete('delete_test');

      const deleted = await repository.getById('delete_test');
      expect(deleted).toBeNull();
    });

    it('should not throw when deleting non-existent email', async () => {
      await expect(repository.delete('non_existent')).resolves.not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      db.close();

      await expect(repository.delete('any_id')).rejects.toThrow(DatabaseError);
    });
  });
});
