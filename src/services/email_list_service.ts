import type { Email } from '@/core/entities.js';

export interface EmailFilters {
  sender?: string;
  dateFrom?: number;
  dateTo?: number;
  label?: string;
  category?: string;
}

function matchesSender(email: Email, sender?: string): boolean {
  if (!sender) return true;
  return (email.sender ?? '').toLowerCase() === sender.toLowerCase();
}

function matchesDate(email: Email, dateFrom?: number, dateTo?: number): boolean {
  if (dateFrom && email.received_at < dateFrom) return false;
  if (dateTo && email.received_at > dateTo) return false;
  return true;
}

function matchesLabel(email: Email, label?: string): boolean {
  if (!label) return true;
  return (email.labels ?? []).includes(label);
}

function matchesCategory(email: Email, category?: string): boolean {
  if (!category) return true;
  return email.category === category;
}

export function listEmails(emails: Email[], filters: EmailFilters = {}): Email[] {
  return emails
    .filter((email) => {
      return (
        matchesSender(email, filters.sender) &&
        matchesDate(email, filters.dateFrom, filters.dateTo) &&
        matchesLabel(email, filters.label) &&
        matchesCategory(email, filters.category)
      );
    })
    .sort((a, b) => b.received_at - a.received_at);
}
