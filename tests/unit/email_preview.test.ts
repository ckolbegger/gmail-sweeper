import { describe, expect, it } from 'vitest';

import {
  BLANK_LINE_BODY,
  HTML_VS_PLAIN_ANCHORS,
  HTML_VS_PLAIN_BODY
} from './fixtures/email_detail_rendering.fixtures.js';

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

  it('should collapse blank line runs in rendered body', () => {
    const lines = renderEmailPreview(detail({ body: BLANK_LINE_BODY }));
    const body = lines.join('\n');

    expect(body).not.toContain('\n\n\n\n');
  });

  it('should prefer html anchor text when available', () => {
    const lines = renderEmailPreview(detail({ body: HTML_VS_PLAIN_BODY, html_body: HTML_VS_PLAIN_ANCHORS }));
    const body = lines.join('\n');

    expect(body).toContain('Daily Briefing');
    expect(body).not.toContain('https://example.com/news');
  });

  it('should not require interaction metadata for rendered links', () => {
    const lines = renderEmailPreview(detail({ body: 'Open https://example.com/path' }));
    const body = lines.join('\n');

    expect(body).toContain('example.com');
    expect(body).not.toContain('open-url');
    expect(body).not.toContain('copy-url');
  });
});
