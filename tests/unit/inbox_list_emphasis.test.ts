import { describe, expect, it } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { renderInboxList } from '@/tui/inbox_list.js';

describe('inbox list emphasis', () => {
  it('should render unread in bold', () => {
    const email = createEmail({
      message_id: 'msg-1',
      received_at: Date.now(),
      subject: 'Unread'
    });

    const output = renderInboxList([email]);

    expect(output[0]).toContain('**Unread**');
  });

  it('should render read in normal weight', () => {
    const email = createEmail({
      message_id: 'msg-2',
      received_at: Date.now(),
      subject: 'Read',
      is_read: true
    });

    const output = renderInboxList([email]);

    expect(output[0]).toContain('Read');
    expect(output[0]).not.toContain('**Read**');
  });
});
