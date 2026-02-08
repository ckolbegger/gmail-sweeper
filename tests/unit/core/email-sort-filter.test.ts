import { describe, it, expect } from 'vitest';
import { sortEmails } from '../../../src/core/services/email-sorter';
import { filterEmails } from '../../../src/core/services/email-filter';
import type { Email } from '../../../src/core/models/email';

/**
 * T026 - Unit test for email sorting and filtering logic
 *
 * Test requirements from tasks.md T032 (email-sorter):
 * - it should sort emails by date descending (default)
 * - it should sort emails by date ascending
 * - it should sort emails by sender alphabetically
 * - it should sort emails by subject alphabetically
 * - it should handle null/undefined dates gracefully
 *
 * Test requirements from tasks.md T033 (email-filter):
 * - it should filter by sender email address
 * - it should filter by date range
 * - it should filter by label
 * - it should filter by read/unread status
 * - it should combine multiple filters with AND logic
 * - it should handle empty filter results
 */

// Test fixture helpers
function createEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-id',
    threadId: 'thread-id',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-15T10:00:00Z'),
    body: { text: 'Test body' },
    labels: ['INBOX'],
    isRead: false,
    snippet: 'Test snippet',
    historyId: 'history-id',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('email-sorter', () => {
  describe('sortEmails', () => {
    it('should sort emails by date descending (default)', () => {
      const emails = [
        createEmail({ id: '1', dateReceived: new Date('2024-01-10T10:00:00Z') }),
        createEmail({ id: '2', dateReceived: new Date('2024-01-15T10:00:00Z') }),
        createEmail({ id: '3', dateReceived: new Date('2024-01-05T10:00:00Z') }),
      ];

      const result = sortEmails(emails);

      expect(result.map(e => e.id)).toEqual(['2', '1', '3']);
    });

    it('should sort emails by date ascending', () => {
      const emails = [
        createEmail({ id: '1', dateReceived: new Date('2024-01-10T10:00:00Z') }),
        createEmail({ id: '2', dateReceived: new Date('2024-01-15T10:00:00Z') }),
        createEmail({ id: '3', dateReceived: new Date('2024-01-05T10:00:00Z') }),
      ];

      const result = sortEmails(emails, { field: 'date', direction: 'asc' });

      expect(result.map(e => e.id)).toEqual(['3', '1', '2']);
    });

    it('should sort emails by sender alphabetically', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'charlie@example.com' } }),
        createEmail({ id: '2', sender: { email: 'alice@example.com' } }),
        createEmail({ id: '3', sender: { email: 'bob@example.com' } }),
      ];

      const result = sortEmails(emails, { field: 'sender', direction: 'asc' });

      expect(result.map(e => e.id)).toEqual(['2', '3', '1']);
    });

    it('should sort emails by sender alphabetically descending', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'charlie@example.com' } }),
        createEmail({ id: '2', sender: { email: 'alice@example.com' } }),
        createEmail({ id: '3', sender: { email: 'bob@example.com' } }),
      ];

      const result = sortEmails(emails, { field: 'sender', direction: 'desc' });

      expect(result.map(e => e.id)).toEqual(['1', '3', '2']);
    });

    it('should sort emails by subject alphabetically', () => {
      const emails = [
        createEmail({ id: '1', subject: 'Zebra' }),
        createEmail({ id: '2', subject: 'Apple' }),
        createEmail({ id: '3', subject: 'Banana' }),
      ];

      const result = sortEmails(emails, { field: 'subject', direction: 'asc' });

      expect(result.map(e => e.id)).toEqual(['2', '3', '1']);
    });

    it('should sort emails by subject alphabetically descending', () => {
      const emails = [
        createEmail({ id: '1', subject: 'Zebra' }),
        createEmail({ id: '2', subject: 'Apple' }),
        createEmail({ id: '3', subject: 'Banana' }),
      ];

      const result = sortEmails(emails, { field: 'subject', direction: 'desc' });

      expect(result.map(e => e.id)).toEqual(['1', '3', '2']);
    });

    it('should handle null/undefined dates gracefully', () => {
      const emails = [
        createEmail({ id: '1', dateReceived: undefined as unknown as Date }),
        createEmail({ id: '2', dateReceived: new Date('2024-01-15T10:00:00Z') }),
        createEmail({ id: '3', dateReceived: null as unknown as Date }),
      ];

      const result = sortEmails(emails, { field: 'date', direction: 'asc' });

      // Emails with null/undefined dates should be placed at the end
      expect(result.map(e => e.id)).toEqual(['2', '1', '3']);
    });

    it('should handle empty email array', () => {
      const result = sortEmails([]);
      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const emails = [
        createEmail({ id: '1', subject: 'B' }),
        createEmail({ id: '2', subject: 'A' }),
      ];
      const originalOrder = emails.map(e => e.id);

      sortEmails(emails, { field: 'subject', direction: 'asc' });

      expect(emails.map(e => e.id)).toEqual(originalOrder);
    });

    it('should sort case-insensitively for subject', () => {
      const emails = [
        createEmail({ id: '1', subject: 'zebra' }),
        createEmail({ id: '2', subject: 'Apple' }),
        createEmail({ id: '3', subject: 'BANANA' }),
      ];

      const result = sortEmails(emails, { field: 'subject', direction: 'asc' });

      expect(result.map(e => e.id)).toEqual(['2', '3', '1']);
    });

    it('should sort case-insensitively for sender', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'ZEBRA@example.com' } }),
        createEmail({ id: '2', sender: { email: 'alice@example.com' } }),
        createEmail({ id: '3', sender: { email: 'BOB@example.com' } }),
      ];

      const result = sortEmails(emails, { field: 'sender', direction: 'asc' });

      expect(result.map(e => e.id)).toEqual(['2', '3', '1']);
    });

    it('should use sender name when available for sorting', () => {
      const emails = [
        createEmail({ id: '1', sender: { name: 'Zebra', email: 'z@example.com' } }),
        createEmail({ id: '2', sender: { name: 'Alice', email: 'a@example.com' } }),
        createEmail({ id: '3', sender: { name: 'Bob', email: 'b@example.com' } }),
      ];

      const result = sortEmails(emails, { field: 'sender', direction: 'asc' });

      expect(result.map(e => e.id)).toEqual(['2', '3', '1']);
    });

    it('should fall back to email when sender name is not available', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'zebra@example.com' } }),
        createEmail({ id: '2', sender: { name: '', email: 'alice@example.com' } }),
        createEmail({ id: '3', sender: { email: 'bob@example.com' } }),
      ];

      const result = sortEmails(emails, { field: 'sender', direction: 'asc' });

      expect(result.map(e => e.id)).toEqual(['2', '3', '1']);
    });
  });
});

describe('email-filter', () => {
  describe('filterEmails', () => {
    it('should filter by sender email address', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'alice@example.com' } }),
        createEmail({ id: '2', sender: { email: 'bob@example.com' } }),
        createEmail({ id: '3', sender: { email: 'alice@example.com' } }),
      ];

      const result = filterEmails(emails, { sender: 'alice@example.com' });

      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });

    it('should filter by sender email with partial match', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'alice@example.com' } }),
        createEmail({ id: '2', sender: { email: 'bob@company.com' } }),
        createEmail({ id: '3', sender: { email: 'charlie@example.com' } }),
      ];

      const result = filterEmails(emails, { sender: 'example.com' });

      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });

    it('should filter by date range', () => {
      const emails = [
        createEmail({ id: '1', dateReceived: new Date('2024-01-05T10:00:00Z') }),
        createEmail({ id: '2', dateReceived: new Date('2024-01-10T10:00:00Z') }),
        createEmail({ id: '3', dateReceived: new Date('2024-01-15T10:00:00Z') }),
        createEmail({ id: '4', dateReceived: new Date('2024-01-20T10:00:00Z') }),
      ];

      const result = filterEmails(emails, {
        dateRange: {
          start: new Date('2024-01-08T00:00:00Z'),
          end: new Date('2024-01-18T23:59:59Z'),
        },
      });

      expect(result.map(e => e.id)).toEqual(['2', '3']);
    });

    it('should filter by date range with only start date', () => {
      const emails = [
        createEmail({ id: '1', dateReceived: new Date('2024-01-05T10:00:00Z') }),
        createEmail({ id: '2', dateReceived: new Date('2024-01-15T10:00:00Z') }),
        createEmail({ id: '3', dateReceived: new Date('2024-01-25T10:00:00Z') }),
      ];

      const result = filterEmails(emails, {
        dateRange: {
          start: new Date('2024-01-10T00:00:00Z'),
        },
      });

      expect(result.map(e => e.id)).toEqual(['2', '3']);
    });

    it('should filter by date range with only end date', () => {
      const emails = [
        createEmail({ id: '1', dateReceived: new Date('2024-01-05T10:00:00Z') }),
        createEmail({ id: '2', dateReceived: new Date('2024-01-15T10:00:00Z') }),
        createEmail({ id: '3', dateReceived: new Date('2024-01-25T10:00:00Z') }),
      ];

      const result = filterEmails(emails, {
        dateRange: {
          end: new Date('2024-01-20T00:00:00Z'),
        },
      });

      expect(result.map(e => e.id)).toEqual(['1', '2']);
    });

    it('should filter by label', () => {
      const emails = [
        createEmail({ id: '1', labels: ['INBOX', 'IMPORTANT'] }),
        createEmail({ id: '2', labels: ['INBOX'] }),
        createEmail({ id: '3', labels: ['IMPORTANT', 'STARRED'] }),
      ];

      const result = filterEmails(emails, { label: 'IMPORTANT' });

      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });

    it('should filter by read status (true)', () => {
      const emails = [
        createEmail({ id: '1', isRead: true }),
        createEmail({ id: '2', isRead: false }),
        createEmail({ id: '3', isRead: true }),
      ];

      const result = filterEmails(emails, { isRead: true });

      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });

    it('should filter by unread status (false)', () => {
      const emails = [
        createEmail({ id: '1', isRead: true }),
        createEmail({ id: '2', isRead: false }),
        createEmail({ id: '3', isRead: false }),
      ];

      const result = filterEmails(emails, { isRead: false });

      expect(result.map(e => e.id)).toEqual(['2', '3']);
    });

    it('should combine multiple filters with AND logic', () => {
      const emails = [
        createEmail({
          id: '1',
          sender: { email: 'alice@example.com' },
          labels: ['IMPORTANT'],
          isRead: false,
        }),
        createEmail({
          id: '2',
          sender: { email: 'alice@example.com' },
          labels: ['INBOX'],
          isRead: false,
        }),
        createEmail({
          id: '3',
          sender: { email: 'bob@example.com' },
          labels: ['IMPORTANT'],
          isRead: false,
        }),
        createEmail({
          id: '4',
          sender: { email: 'alice@example.com' },
          labels: ['IMPORTANT'],
          isRead: true,
        }),
      ];

      const result = filterEmails(emails, {
        sender: 'alice@example.com',
        label: 'IMPORTANT',
        isRead: false,
      });

      expect(result.map(e => e.id)).toEqual(['1']);
    });

    it('should handle empty filter results', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'alice@example.com' } }),
        createEmail({ id: '2', sender: { email: 'bob@example.com' } }),
      ];

      const result = filterEmails(emails, { sender: 'charlie@example.com' });

      expect(result).toEqual([]);
    });

    it('should return all emails when no filters are provided', () => {
      const emails = [
        createEmail({ id: '1' }),
        createEmail({ id: '2' }),
        createEmail({ id: '3' }),
      ];

      const result = filterEmails(emails, {});

      expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
    });

    it('should handle empty email array', () => {
      const result = filterEmails([], { sender: 'test@example.com' });
      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const emails = [
        createEmail({ id: '1', sender: { email: 'alice@example.com' } }),
        createEmail({ id: '2', sender: { email: 'bob@example.com' } }),
      ];
      const originalLength = emails.length;

      filterEmails(emails, { sender: 'alice@example.com' });

      expect(emails).toHaveLength(originalLength);
    });

    it('should filter by subject containing text', () => {
      const emails = [
        createEmail({ id: '1', subject: 'Important meeting tomorrow' }),
        createEmail({ id: '2', subject: 'Weekly newsletter' }),
        createEmail({ id: '3', subject: 'Meeting notes from yesterday' }),
      ];

      const result = filterEmails(emails, { subject: 'meeting' });

      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });

    it('should filter by subject case-insensitively', () => {
      const emails = [
        createEmail({ id: '1', subject: 'IMPORTANT Announcement' }),
        createEmail({ id: '2', subject: 'Weekly newsletter' }),
      ];

      const result = filterEmails(emails, { subject: 'important' });

      expect(result.map(e => e.id)).toEqual(['1']);
    });

    it('should filter by category', () => {
      const emails = [
        createEmail({ id: '1', category: 'social' }),
        createEmail({ id: '2', category: 'promotions' }),
        createEmail({ id: '3', category: 'social' }),
      ];

      const result = filterEmails(emails, { category: 'social' });

      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });

    it('should handle emails without category when filtering by category', () => {
      const emails = [
        createEmail({ id: '1', category: 'social' }),
        createEmail({ id: '2' }),
        createEmail({ id: '3', category: undefined }),
      ];

      const result = filterEmails(emails, { category: 'social' });

      expect(result.map(e => e.id)).toEqual(['1']);
    });

    it('should filter by multiple labels (OR logic within label filter)', () => {
      const emails = [
        createEmail({ id: '1', labels: ['IMPORTANT'] }),
        createEmail({ id: '2', labels: ['STARRED'] }),
        createEmail({ id: '3', labels: ['IMPORTANT', 'STARRED'] }),
        createEmail({ id: '4', labels: ['INBOX'] }),
      ];

      const result = filterEmails(emails, { labels: ['IMPORTANT', 'STARRED'] });

      expect(result.map(e => e.id)).toEqual(['1', '2', '3']);
    });

    it('should filter by thread ID', () => {
      const emails = [
        createEmail({ id: '1', threadId: 'thread-a' }),
        createEmail({ id: '2', threadId: 'thread-b' }),
        createEmail({ id: '3', threadId: 'thread-a' }),
      ];

      const result = filterEmails(emails, { threadId: 'thread-a' });

      expect(result.map(e => e.id)).toEqual(['1', '3']);
    });
  });
});
