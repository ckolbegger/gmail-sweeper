import { describe, expect, it } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { applyInboxFilters } from '@/tui/inbox_filters.js';

describe('inbox filters wiring', () => {
  it('should complete successfully', () => {
    const emails = [
      createEmail({
        message_id: 'msg-1',
        received_at: Date.now(),
        subject: 'Welcome',
        sender: 'welcome@service.com',
        labels: ['INBOX']
      })
    ];

    const result = applyInboxFilters(emails, { sender: 'welcome@service.com' });

    expect(result.error).toBeUndefined();
    expect(result.output).toHaveLength(1);
    expect(result.output[0]).toContain('Welcome');
  });

  it('should handle error conditions', () => {
    const result = applyInboxFilters(null as unknown as never[], { sender: 'bad' });

    expect(result.error).toBe('Emails must be an array');
    expect(result.output).toEqual(['(error) Emails must be an array']);
  });
});
