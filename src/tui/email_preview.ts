import type { EmailDetail } from '@/adapters/gmail/get_email.js';

export function renderEmailPreview(detail: EmailDetail): string[] {
  return [
    'Detail View',
    `Message: ${detail.message_id}`,
    `Subject: ${detail.subject}`,
    `From: ${detail.sender}`,
    `Date: ${new Date(detail.received_at).toISOString()}`,
    '',
    detail.body.length > 0 ? detail.body : '(no body)'
  ];
}
