import { describe, expect, it } from 'vitest';

import { listEmails, type EmailFilters, type EmailRecord } from '@/services/email_list_service.js';

const BASE_EMAILS: EmailRecord[] = [
  {
    messageId: 'msg-1',
    subject: 'Welcome',
    sender: 'welcome@service.com',
    receivedAt: Date.parse('2026-01-30T10:00:00Z'),
    labels: ['INBOX', 'IMPORTANT'],
    category: 'primary',
    isRead: false
  },
  {
    messageId: 'msg-2',
    subject: 'Sale now on',
    sender: 'promo@shop.com',
    receivedAt: Date.parse('2026-01-25T09:00:00Z'),
    labels: ['INBOX', 'PROMOTIONS'],
    category: 'promotions',
    isRead: true
  },
  {
    messageId: 'msg-3',
    subject: 'Team update',
    sender: 'lead@work.com',
    receivedAt: Date.parse('2026-01-28T18:30:00Z'),
    labels: ['INBOX', 'WORK'],
    category: 'updates',
    isRead: false
  }
];

describe('listEmails contract', () => {
  it('should return a list with required fields', () => {
    const results = listEmails(BASE_EMAILS, {});

    expect(results).toHaveLength(3);
    for (const email of results) {
      expect(email.messageId).toBeTypeOf('string');
      expect(email.subject).toBeTypeOf('string');
      expect(email.sender).toBeTypeOf('string');
      expect(email.receivedAt).toBeTypeOf('number');
      expect(Array.isArray(email.labels)).toBe(true);
      expect(email.category).toBeTypeOf('string');
      expect(email.isRead).toBeTypeOf('boolean');
    }
  });

  it('should honor sender/date/label/category filters', () => {
    const filters: EmailFilters = {
      sender: 'lead@work.com',
      dateFrom: Date.parse('2026-01-27T00:00:00Z'),
      dateTo: Date.parse('2026-01-29T23:59:59Z'),
      label: 'WORK',
      category: 'updates'
    };

    const results = listEmails(BASE_EMAILS, filters);

    expect(results).toHaveLength(1);
    expect(results[0]?.messageId).toBe('msg-3');
  });

  it('should return an empty list when no matches', () => {
    const filters: EmailFilters = {
      sender: 'nobody@nowhere.com'
    };

    const results = listEmails(BASE_EMAILS, filters);

    expect(results).toEqual([]);
  });
});
