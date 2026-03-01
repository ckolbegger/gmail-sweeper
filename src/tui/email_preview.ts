import type { EmailDetail } from '@/adapters/gmail/get_email.js';
import { formatEmailDetailBody } from '@/tui/email_detail_formatter.js';

const DEFAULT_DETAIL_PANE_WIDTH = 80;

export function renderEmailPreview(detail: EmailDetail, detailPaneWidth = DEFAULT_DETAIL_PANE_WIDTH): string[] {
  const formattedBody = formatEmailDetailBody({
    body: detail.body,
    htmlBody: detail.html_body,
    detailPaneWidth
  });
  const bodyLines = formattedBody.length > 0 ? formattedBody.split('\n') : ['(no body)'];

  return [
    'Detail View',
    `Message: ${detail.message_id}`,
    `Subject: ${detail.subject}`,
    `From: ${detail.sender}`,
    `Date: ${new Date(detail.received_at).toISOString()}`,
    '',
    ...bodyLines
  ];
}
