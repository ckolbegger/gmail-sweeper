import { toConfidenceLevel } from '@/adapters/ai/provider.js';
import type { Email } from '@/core/entities.js';

export interface InboxListRenderOptions {
  isFilterActive?: boolean;
  matchingCount?: number;
  totalCount?: number;
  emptyFilterMessage?: string;
  confidenceByEmailId?: Record<string, number>;
}

export function formatConfidenceIndicator(confidence: number): string {
  const level = toConfidenceLevel(confidence);
  const percent = Math.max(0, Math.min(100, Math.round(confidence * 100)));
  return `[${level} ${percent}%]`;
}

function renderEmailRows(emails: Email[], confidenceByEmailId?: Record<string, number>): string[] {
  return emails.map((email) => {
    const subjectValue = email.subject ?? '(no subject)';
    const senderValue = email.sender ?? '(unknown sender)';
    const subject = email.is_read ? subjectValue : `**${subjectValue}**`;
    const confidence = confidenceByEmailId?.[email.message_id];
    const suffix = confidence === undefined ? '' : ` ${formatConfidenceIndicator(confidence)}`;
    return `${subject} — ${senderValue}${suffix}`;
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

  return [summaryLine, ...renderEmailRows(emails, options.confidenceByEmailId)];
}
