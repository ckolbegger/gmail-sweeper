import { describe, expect, it } from 'vitest';

import { createEmail, type Email } from '@/core/entities.js';
import { runFilterWorkflow, type InboxFilterInput } from '@/services/filter_workflow.js';

const EMAILS: Email[] = [
  createEmail({
    message_id: 'msg-1',
    subject: 'Welcome to the app',
    sender: 'welcome@service.com',
    received_at: Date.parse('2026-01-30T10:00:00Z'),
    labels: ['INBOX', 'IMPORTANT'],
    category: 'primary',
    is_read: false
  }),
  createEmail({
    message_id: 'msg-2',
    subject: 'Sale now on',
    sender: 'promo@shop.com',
    received_at: Date.parse('2026-01-25T09:00:00Z'),
    labels: ['INBOX', 'PROMOTIONS'],
    category: 'promotions',
    is_read: true
  }),
  createEmail({
    message_id: 'msg-3',
    subject: 'Team update',
    sender: 'lead@work.com',
    received_at: Date.parse('2026-01-28T18:30:00Z'),
    labels: ['INBOX', 'WORK'],
    category: 'updates',
    is_read: false
  })
];

describe('filter workflow integration', () => {
  it('should load inbox then apply filters end-to-end', () => {
    const filters: InboxFilterInput = {
      sender: 'lead@work.com',
      label: 'WORK'
    };

    const output = runFilterWorkflow(EMAILS, filters);

    expect(output).toHaveLength(1);
    expect(output[0]).toContain('Team update');
  });

  it('should update list and unread emphasis after filter', () => {
    const filters: InboxFilterInput = {
      sender: 'welcome@service.com'
    };

    const output = runFilterWorkflow(EMAILS, filters);

    expect(output).toHaveLength(1);
    expect(output[0]).toContain('**');
  });

  it('should handle no-match filters with empty state', () => {
    const filters: InboxFilterInput = {
      category: 'finance'
    };

    const output = runFilterWorkflow(EMAILS, filters);

    expect(output).toEqual(['(no messages)']);
  });
});
