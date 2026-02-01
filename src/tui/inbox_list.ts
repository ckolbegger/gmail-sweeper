import type { Email } from '@/core/entities.js';

export function renderInboxList(emails: Email[]): string[] {
  if (emails.length === 0) {
    return ['(no messages)'];
  }

  return emails.map((email) => {
    const subjectValue = email.subject ?? '(no subject)';
    const senderValue = email.sender ?? '(unknown sender)';
    const subject = email.is_read ? subjectValue : `**${subjectValue}**`;
    return `${subject} — ${senderValue}`;
  });
}
