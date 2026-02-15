import { describe, expect, it } from 'vitest';

import type { EmailDetail } from '@/adapters/gmail/get_email.js';
import { renderEmailPreview } from '@/tui/email_preview.js';

function detail(overrides: Partial<EmailDetail> = {}): EmailDetail {
  return {
    message_id: 'msg-1',
    subject: 'Subject',
    sender: 'sender@example.com',
    received_at: Date.parse('2026-02-08T10:00:00Z'),
    body: 'Hello body',
    headers: { subject: 'Subject', from: 'sender@example.com' },
    labels: ['INBOX'],
    is_read: false,
    ...overrides
  };
}

describe('email preview panel', () => {
  it('should render subject, sender, and body', () => {
    const lines = renderEmailPreview(detail());

    expect(lines.join('\n')).toContain('Subject: Subject');
    expect(lines.join('\n')).toContain('From: sender@example.com');
    expect(lines.join('\n')).toContain('Hello body');
  });

  it('should update when selection changes', () => {
    const first = renderEmailPreview(detail({ message_id: 'msg-1', subject: 'First' }));
    const second = renderEmailPreview(detail({ message_id: 'msg-2', subject: 'Second' }));

    expect(first).not.toEqual(second);
    expect(second.join('\n')).toContain('Subject: Second');
  });
});
