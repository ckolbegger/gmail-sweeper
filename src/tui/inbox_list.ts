import type { Email } from '@/core/entities.js';

export interface InboxListRenderOptions {
  isFilterActive?: boolean;
  matchingCount?: number;
  totalCount?: number;
  emptyFilterMessage?: string;
}

function renderEmailRows(emails: Email[]): string[] {
  return emails.map((email) => {
    const subjectValue = email.subject ?? '(no subject)';
    const senderValue = email.sender ?? '(unknown sender)';
    const subject = email.is_read ? subjectValue : `**${subjectValue}**`;
    return `${subject} — ${senderValue}`;
  });
}

export function renderInboxList(emails: Email[], options: InboxListRenderOptions = {}): string[] {
  const isFilterActive = options.isFilterActive ?? false;

  if (!isFilterActive) {
    if (emails.length === 0) {
      return ['(no messages)'];
    }

    return renderEmailRows(emails);
  }

  const matchingCount = options.matchingCount ?? emails.length;
  const totalCount = options.totalCount ?? emails.length;
  const summaryLine = `Filtered: ${matchingCount}/${totalCount} emails`;

  if (emails.length === 0) {
    return [summaryLine, options.emptyFilterMessage ?? '(no matches for active filter)'];
  }

  return [summaryLine, ...renderEmailRows(emails)];
}
