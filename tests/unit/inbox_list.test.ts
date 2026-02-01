import { describe, expect, it } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { renderInboxList } from '@/tui/inbox_list.js';

describe('inbox list view', () => {
  it('should render a list of emails', () => {
    const emails = [
      createEmail({
        message_id: 'msg-1',
        received_at: Date.now(),
        subject: 'Hello',
        sender: 'a@example.com'
      }),
      createEmail({
        message_id: 'msg-2',
        received_at: Date.now(),
        subject: 'Update',
        sender: 'b@example.com',
        is_read: true
      })
    ];

    const output = renderInboxList(emails);

    expect(output).toHaveLength(2);
    expect(output[0]).toContain('Hello');
    expect(output[1]).toContain('Update');
  });

  it('should highlight unread emails', () => {
    const emails = [
      createEmail({
        message_id: 'msg-1',
        received_at: Date.now(),
        subject: 'Unread',
        sender: 'a@example.com'
      })
    ];

    const output = renderInboxList(emails);

    expect(output[0]).toContain('**Unread**');
  });

  it('should update when data changes', () => {
    const first = renderInboxList([
      createEmail({
        message_id: 'msg-1',
        received_at: Date.now(),
        subject: 'First',
        sender: 'a@example.com'
      })
    ]);

    const second = renderInboxList([
      createEmail({
        message_id: 'msg-2',
        received_at: Date.now(),
        subject: 'Second',
        sender: 'b@example.com'
      })
    ]);

    expect(first).not.toEqual(second);
    expect(second[0]).toContain('Second');
  });
});
