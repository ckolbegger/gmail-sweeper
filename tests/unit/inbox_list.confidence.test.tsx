import { describe, expect, it } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { renderInboxList } from '@/tui/inbox_list.js';

describe('inbox list confidence indicators', () => {
  it('should render confidence indicators for filtered matches', () => {
    const emails = [
      createEmail({
        message_id: 'msg-1',
        received_at: Date.now(),
        subject: 'Receipt',
        sender: 'billing@example.com'
      }),
      createEmail({
        message_id: 'msg-2',
        received_at: Date.now(),
        subject: 'Invitation',
        sender: 'events@example.com'
      }),
      createEmail({
        message_id: 'msg-3',
        received_at: Date.now(),
        subject: 'Newsletter',
        sender: 'news@example.com'
      })
    ];

    const lines = renderInboxList(emails, {
      isFilterActive: true,
      matchingCount: 3,
      totalCount: 10,
      confidenceByEmailId: {
        'msg-1': 0.91,
        'msg-2': 0.57,
        'msg-3': 0.22
      }
    });

    const rendered = lines.join('\n');
    expect(rendered).toContain('[high 91%]');
    expect(rendered).toContain('[medium 57%]');
    expect(rendered).toContain('[low 22%]');
  });
});
