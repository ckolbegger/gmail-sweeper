/**
 * Unit tests for email sorting and filtering logic
 *
 * TDD: Tests must FAIL before implementation
 *
 * Tests:
 * - it should sort emails by date descending (default)
 * - it should sort emails by date ascending
 * - it should sort emails by sender alphabetically
 * - it should sort emails by subject alphabetically
 * - it should handle null/undefined dates gracefully
 * - it should filter by sender email address
 * - it should filter by date range
 * - it should filter by label
 * - it should filter by read/unread status
 * - it should combine multiple filters with AND logic
 * - it should handle empty filter results
 */

import { describe, it, expect } from 'vitest';
import { EmailSorter } from '../../../src/core/services/email-sorter.js';
import { EmailFilter } from '../../../src/core/services/email-filter.js';
import type { Email } from '../../../src/core/models/email.js';

describe('EmailSorter', () => {
  let sorter: EmailSorter;
  const testEmails: Email[] = [
    {
      id: 'email-1',
      threadId: 'thread-1',
      subject: 'Zebra Subject',
      sender: { name: 'Charlie', email: 'charlie@example.com' },
      recipients: [],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-03T10:00:00Z'),
      body: { text: '', html: undefined },
      labels: ['INBOX'],
      isRead: true,
      category: 'updates',
      snippet: '',
      historyId: '',
      syncedAt: new Date(),
    },
    {
      id: 'email-2',
      threadId: 'thread-2',
      subject: 'Alpha Subject',
      sender: { name: 'Alice', email: 'alice@example.com' },
      recipients: [],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-01T10:00:00Z'),
      body: { text: '', html: undefined },
      labels: ['INBOX'],
      isRead: false,
      category: 'social',
      snippet: '',
      historyId: '',
      syncedAt: new Date(),
    },
    {
      id: 'email-3',
      threadId: 'thread-3',
      subject: 'Middle Subject',
      sender: { name: 'Bob', email: 'bob@example.com' },
      recipients: [],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-02T10:00:00Z'),
      body: { text: '', html: undefined },
      labels: ['INBOX'],
      isRead: false,
      category: 'promotions',
      snippet: '',
      historyId: '',
      syncedAt: new Date(),
    },
  ];

  beforeEach(() => {
    sorter = new EmailSorter();
  });

  describe('sortByDate', () => {
    it('should sort emails by date descending (default)', () => {
      const sorted = sorter.sortByDate(testEmails, 'desc');

      expect(sorted[0].id).toBe('email-1'); // 2024-01-03
      expect(sorted[1].id).toBe('email-3'); // 2024-01-02
      expect(sorted[2].id).toBe('email-2'); // 2024-01-01
    });

    it('should sort emails by date ascending', () => {
      const sorted = sorter.sortByDate(testEmails, 'asc');

      expect(sorted[0].id).toBe('email-2'); // 2024-01-01
      expect(sorted[1].id).toBe('email-3'); // 2024-01-02
      expect(sorted[2].id).toBe('email-1'); // 2024-01-03
    });

    it('should handle null/undefined dates gracefully', () => {
      const emailsWithNull: Email[] = [
        ...testEmails,
        {
          ...testEmails[0],
          id: 'email-null',
          dateReceived: null as unknown as Date,
        },
      ];

      const sorted = sorter.sortByDate(emailsWithNull, 'desc');

      // Null dates should be at the end
      expect(sorted[sorted.length - 1].id).toBe('email-null');
    });
  });

  describe('sortBySender', () => {
    it('should sort emails by sender alphabetically', () => {
      const sorted = sorter.sortBySender(testEmails, 'asc');

      expect(sorted[0].sender.email).toBe('alice@example.com');
      expect(sorted[1].sender.email).toBe('bob@example.com');
      expect(sorted[2].sender.email).toBe('charlie@example.com');
    });

    it('should sort by sender descending', () => {
      const sorted = sorter.sortBySender(testEmails, 'desc');

      expect(sorted[0].sender.email).toBe('charlie@example.com');
      expect(sorted[1].sender.email).toBe('bob@example.com');
      expect(sorted[2].sender.email).toBe('alice@example.com');
    });
  });

  describe('sortBySubject', () => {
    it('should sort emails by subject alphabetically', () => {
      const sorted = sorter.sortBySubject(testEmails, 'asc');

      expect(sorted[0].subject).toBe('Alpha Subject');
      expect(sorted[1].subject).toBe('Middle Subject');
      expect(sorted[2].subject).toBe('Zebra Subject');
    });
  });
});

describe('EmailFilter', () => {
  let filter: EmailFilter;
  const testEmails: Email[] = [
    {
      id: 'email-1',
      threadId: 'thread-1',
      subject: 'Work Email',
      sender: { name: 'Alice', email: 'alice@work.com' },
      recipients: [],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-01T10:00:00Z'),
      body: { text: '', html: undefined },
      labels: ['INBOX', 'IMPORTANT'],
      isRead: true,
      category: 'updates',
      snippet: '',
      historyId: '',
      syncedAt: new Date(),
    },
    {
      id: 'email-2',
      threadId: 'thread-2',
      subject: 'Personal Email',
      sender: { name: 'Bob', email: 'bob@personal.com' },
      recipients: [],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-15T10:00:00Z'),
      body: { text: '', html: undefined },
      labels: ['INBOX'],
      isRead: false,
      category: 'social',
      snippet: '',
      historyId: '',
      syncedAt: new Date(),
    },
    {
      id: 'email-3',
      threadId: 'thread-3',
      subject: 'Another Work Email',
      sender: { name: 'Alice', email: 'alice@work.com' },
      recipients: [],
      cc: [],
      bcc: [],
      dateReceived: new Date('2024-01-20T10:00:00Z'),
      body: { text: '', html: undefined },
      labels: ['INBOX', 'UNREAD'],
      isRead: false,
      category: 'promotions',
      snippet: '',
      historyId: '',
      syncedAt: new Date(),
    },
  ];

  beforeEach(() => {
    filter = new EmailFilter();
  });

  describe('filterBySender', () => {
    it('should filter by sender email address', () => {
      const filtered = filter.filterBySender(testEmails, 'alice@work.com');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.sender.email === 'alice@work.com')).toBe(true);
    });

    it('should return empty array for non-existent sender', () => {
      const filtered = filter.filterBySender(testEmails, 'nonexistent@example.com');

      expect(filtered).toHaveLength(0);
    });
  });

  describe('filterByDateRange', () => {
    it('should filter by date range', () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-20T23:59:59Z');

      const filtered = filter.filterByDateRange(testEmails, startDate, endDate);

      expect(filtered).toHaveLength(2);
      expect(filtered.some(e => e.id === 'email-2')).toBe(true);
      expect(filtered.some(e => e.id === 'email-3')).toBe(true);
    });

    it('should handle dates outside range', () => {
      const startDate = new Date('2024-02-01T00:00:00Z');
      const endDate = new Date('2024-02-28T23:59:59Z');

      const filtered = filter.filterByDateRange(testEmails, startDate, endDate);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('filterByLabel', () => {
    it('should filter by label', () => {
      const filtered = filter.filterByLabel(testEmails, 'IMPORTANT');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('email-1');
    });

    it('should filter by UNREAD label', () => {
      const filtered = filter.filterByLabel(testEmails, 'UNREAD');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('email-3');
    });
  });

  describe('filterByReadStatus', () => {
    it('should filter by read status', () => {
      const unread = filter.filterByReadStatus(testEmails, false);
      const read = filter.filterByReadStatus(testEmails, true);

      expect(unread).toHaveLength(2);
      expect(read).toHaveLength(1);
    });
  });

  describe('combine filters', () => {
    it('should combine multiple filters with AND logic', () => {
      const result = filter.combine(testEmails, [
        (emails) => filter.filterBySender(emails, 'alice@work.com'),
        (emails) => filter.filterByReadStatus(emails, false),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('email-3');
    });

    it('should handle empty filter results', () => {
      const result = filter.combine(testEmails, [
        (emails) => filter.filterBySender(emails, 'nonexistent@example.com'),
      ]);

      expect(result).toHaveLength(0);
    });
  });
});
