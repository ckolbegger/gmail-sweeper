/**
 * Email Sorter Service
 *
 * Provides sorting functionality for emails.
 */

import type { Email } from '../contracts/types.js';

export type SortField = 'date' | 'sender' | 'subject';
export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

/**
 * Sort emails by the specified field and direction
 */
export function sortEmails(emails: Email[], options?: SortOptions): Email[] {
  const field = options?.field ?? 'date';
  const direction = options?.direction ?? 'desc';
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...emails].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'date':
        comparison = compareDates(a.dateReceived, b.dateReceived);
        break;
      case 'sender':
        comparison = compareSenders(a.sender, b.sender);
        break;
      case 'subject':
        comparison = compareSubjects(a.subject, b.subject);
        break;
    }

    return comparison * multiplier;
  });
}

/**
 * Compare two dates, handling null/undefined
 */
function compareDates(a: Date | null | undefined, b: Date | null | undefined): number {
  // Handle null/undefined dates - place them at the end
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.getTime() - b.getTime();
}

/**
 * Compare two senders by name (fallback to email)
 */
function compareSenders(
  a: Email['sender'],
  b: Email['sender']
): number {
  const aValue = (a.name || a.email).toLowerCase();
  const bValue = (b.name || b.email).toLowerCase();
  return aValue.localeCompare(bValue);
}

/**
 * Compare two subjects
 */
function compareSubjects(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}
