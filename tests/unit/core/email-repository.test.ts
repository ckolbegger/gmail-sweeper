/**
 * Unit tests for EmailRepository
 *
 * TDD: Tests must FAIL before implementation
 *
 * Tests:
 * - it should save email to database
 * - it should retrieve email by ID
 * - it should list emails with pagination
 * - it should update email read status
 * - it should delete email from database
 * - it should handle database errors gracefully
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { EmailRepository } from '../../../src/core/services/email-repository.js';
import type { Email } from '../../../src/core/models/email.js';

describe('EmailRepository', () => {
  let db: Database.Database;
  let emailRepository: EmailRepository;
  const testDbPath = ':memory:';

  const mockEmail: Email = {
    id: 'email-123',
    threadId: 'thread-123',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ name: 'Test Recipient', email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-01T12:00:00Z'),
    body: { text: 'Test body text', html: '<p>Test body html</p>' },
    labels: ['INBOX', 'UNREAD'],
    isRead: false,
    category: 'updates',
    snippet: 'Test snippet',
    historyId: 'history-123',
    syncedAt: new Date(),
  };

  beforeEach(async () => {
    // Create in-memory database for tests
    db = new Database(testDbPath);
    emailRepository = new EmailRepository(db);

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

  afterEach(() => {
    db.close();
  });

  describe('save', () => {
    it('should save email to database', async () => {
      await emailRepository.save(mockEmail);

      const retrieved = await emailRepository.getById('email-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('email-123');
      expect(retrieved?.subject).toBe('Test Subject');
      expect(retrieved?.sender.email).toBe('sender@example.com');
    });

    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      db.close();

      await expect(emailRepository.save(mockEmail)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should retrieve email by ID', async () => {
      await emailRepository.save(mockEmail);

      const retrieved = await emailRepository.getById('email-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('email-123');
      expect(retrieved?.subject).toBe('Test Subject');
    });

    it('should return null for non-existent email', async () => {
      const retrieved = await emailRepository.getById('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Add multiple test emails
      await emailRepository.save(mockEmail);
      await emailRepository.save({
        ...mockEmail,
        id: 'email-456',
        subject: 'Another Subject',
        dateReceived: new Date('2024-01-02T12:00:00Z'),
      });
      await emailRepository.save({
        ...mockEmail,
        id: 'email-789',
        subject: 'Third Subject',
        dateReceived: new Date('2024-01-03T12:00:00Z'),
      });
    });

    it('should list emails with pagination', async () => {
      const result = await emailRepository.list({ page: 1, pageSize: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it('should return empty array for page beyond results', async () => {
      const result = await emailRepository.list({ page: 10, pageSize: 2 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(3);
    });
  });

  describe('updateReadStatus', () => {
    it('should update email read status', async () => {
      await emailRepository.save(mockEmail);

      await emailRepository.updateReadStatus('email-123', true);

      const updated = await emailRepository.getById('email-123');
      expect(updated?.isRead).toBe(true);
    });

    it('should handle updating non-existent email', async () => {
      await expect(
        emailRepository.updateReadStatus('non-existent', true)
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete email from database', async () => {
      await emailRepository.save(mockEmail);

      await emailRepository.delete('email-123');

      const retrieved = await emailRepository.getById('email-123');
      expect(retrieved).toBeNull();
    });

    it('should handle deleting non-existent email', async () => {
      await expect(emailRepository.delete('non-existent')).resolves.not.toThrow();
    });
  });
});
