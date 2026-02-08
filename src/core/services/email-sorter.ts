/**
 * Email Sorter
 *
 * Handles sorting of emails by various fields and directions.
 */

import type { Email } from '../models/email.js';

export type SortDirection = 'asc' | 'desc';

export class EmailSorter {
  /**
   * Sort emails by date
   */
  sortByDate(emails: Email[], direction: SortDirection = 'desc'): Email[] {
    return [...emails].sort((a, b) => {
      const aTime = a.dateReceived?.getTime() ?? 0;
      const bTime = b.dateReceived?.getTime() ?? 0;
      return direction === 'asc' ? aTime - bTime : bTime - aTime;
    });
  }

  /**
   * Sort emails by sender (email address)
   */
  sortBySender(emails: Email[], direction: SortDirection = 'asc'): Email[] {
    return [...emails].sort((a, b) => {
      const aEmail = a.sender.email.toLowerCase();
      const bEmail = b.sender.email.toLowerCase();
      const comparison = aEmail.localeCompare(bEmail);
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Sort emails by subject
   */
  sortBySubject(emails: Email[], direction: SortDirection = 'asc'): Email[] {
    return [...emails].sort((a, b) => {
      const aSubject = a.subject.toLowerCase();
      const bSubject = b.subject.toLowerCase();
      const comparison = aSubject.localeCompare(bSubject);
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Sort emails by first label (alphabetical)
   */
  sortByLabel(emails: Email[], direction: SortDirection = 'asc'): Email[] {
    return [...emails].sort((a, b) => {
      const aLabel = (a.labels[0] ?? '').toLowerCase();
      const bLabel = (b.labels[0] ?? '').toLowerCase();
      const comparison = aLabel.localeCompare(bLabel);
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Sort emails by category
   */
  sortByCategory(emails: Email[], direction: SortDirection = 'asc'): Email[] {
    return [...emails].sort((a, b) => {
      const aCategory = (a.category ?? '').toLowerCase();
      const bCategory = (b.category ?? '').toLowerCase();
      const comparison = aCategory.localeCompare(bCategory);
      return direction === 'asc' ? comparison : -comparison;
    });
  }
}
