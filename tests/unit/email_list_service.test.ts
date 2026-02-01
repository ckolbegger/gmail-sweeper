import { describe, expect, it } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { listEmails } from '@/services/email_list_service.js';

describe('email list service', () => {
  it('should return emails sorted by received_at desc', () => {
    const older = createEmail({
      message_id: 'older',
      received_at: Date.parse('2026-01-20T12:00:00Z'),
      subject: 'Older'
    });
    const newer = createEmail({
      message_id: 'newer',
      received_at: Date.parse('2026-01-30T12:00:00Z'),
      subject: 'Newer'
    });

    const results = listEmails([older, newer]);

    expect(results.map((email) => email.message_id)).toEqual(['newer', 'older']);
  });

  it('should apply sender/date/label/category filters', () => {
    const emails = [
      createEmail({
        message_id: 'msg-1',
        received_at: Date.parse('2026-01-30T10:00:00Z'),
        sender: 'welcome@service.com',
        labels: ['INBOX'],
        category: 'primary'
      }),
      createEmail({
        message_id: 'msg-2',
        received_at: Date.parse('2026-01-25T09:00:00Z'),
        sender: 'promo@shop.com',
        labels: ['INBOX', 'PROMOTIONS'],
        category: 'promotions'
      })
    ];

    const results = listEmails(emails, {
      sender: 'promo@shop.com',
      dateFrom: Date.parse('2026-01-24T00:00:00Z'),
      dateTo: Date.parse('2026-01-26T00:00:00Z'),
      label: 'PROMOTIONS',
      category: 'promotions'
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.message_id).toBe('msg-2');
  });

  it('should handle empty inbox', () => {
    const results = listEmails([]);

    expect(results).toEqual([]);
  });
});
