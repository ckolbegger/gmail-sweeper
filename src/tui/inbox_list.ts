import type { EmailRecord } from '@/services/email_list_service.js';

export function renderInboxList(emails: EmailRecord[]): string[] {
  if (emails.length === 0) {
    return ['(no messages)'];
  }

  return emails.map((email) => {
    const subject = email.isRead ? email.subject : `**${email.subject}**`;
    return `${subject} — ${email.sender}`;
  });
}
