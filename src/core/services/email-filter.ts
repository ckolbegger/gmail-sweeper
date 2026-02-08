/**
 * Email Filter Service
 *
 * Provides filtering functionality for emails.
 */

import type { Email, EmailFilter, GmailCategory } from '../contracts/types.js';

export interface FilterOptions extends EmailFilter {}

/**
 * Filter emails based on the provided filter criteria
 */
export function filterEmails(emails: Email[], filter: FilterOptions): Email[] {
  return emails.filter(email => matchesFilter(email, filter));
}

/**
 * Check if an email matches all filter criteria
 */
function matchesFilter(email: Email, filter: FilterOptions): boolean {
  // Sender filter
  if (filter.sender) {
    const senderMatch =
      email.sender.email.toLowerCase().includes(filter.sender.toLowerCase()) ||
      (email.sender.name?.toLowerCase().includes(filter.sender.toLowerCase()) ?? false);
    if (!senderMatch) return false;
  }

  // Date range filters (legacy)
  if (filter.dateFrom) {
    if (!email.dateReceived || email.dateReceived < filter.dateFrom) {
      return false;
    }
  }

  if (filter.dateTo) {
    if (!email.dateReceived || email.dateReceived > filter.dateTo) {
      return false;
    }
  }

  // Date range filter (new format)
  if (filter.dateRange) {
    if (filter.dateRange.start) {
      if (!email.dateReceived || email.dateReceived < filter.dateRange.start) {
        return false;
      }
    }
    if (filter.dateRange.end) {
      if (!email.dateReceived || email.dateReceived > filter.dateRange.end) {
        return false;
      }
    }
  }

  // Single label filter
  if (filter.label) {
    if (!email.labels.includes(filter.label)) {
      return false;
    }
  }

  // Multiple labels filter (OR logic)
  if (filter.labels && filter.labels.length > 0) {
    const hasLabel = filter.labels.some(label => email.labels.includes(label));
    if (!hasLabel) return false;
  }

  // Read status filter
  if (filter.isRead !== undefined) {
    if (email.isRead !== filter.isRead) return false;
  }

  // Category filter
  if (filter.category) {
    if (email.category !== filter.category) return false;
  }

  // Search text filter (searches subject and snippet)
  if (filter.searchText) {
    const searchLower = filter.searchText.toLowerCase();
    const textMatch =
      email.subject.toLowerCase().includes(searchLower) ||
      email.snippet.toLowerCase().includes(searchLower) ||
      email.body.text.toLowerCase().includes(searchLower);
    if (!textMatch) return false;
  }

  // Subject filter (searches subject only)
  if (filter.subject) {
    const subjectLower = filter.subject.toLowerCase();
    if (!email.subject.toLowerCase().includes(subjectLower)) {
      return false;
    }
  }

  // Thread ID filter
  if (filter.threadId) {
    if (email.threadId !== filter.threadId) {
      return false;
    }
  }

  return true;
}

/**
 * Filter emails by sender email address
 */
export function filterBySender(emails: Email[], senderEmail: string): Email[] {
  return emails.filter(email =>
    email.sender.email.toLowerCase().includes(senderEmail.toLowerCase())
  );
}

/**
 * Filter emails by date range
 */
export function filterByDateRange(
  emails: Email[],
  startDate?: Date,
  endDate?: Date
): Email[] {
  return emails.filter(email => {
    if (!email.dateReceived) return false;
    if (startDate && email.dateReceived < startDate) return false;
    if (endDate && email.dateReceived > endDate) return false;
    return true;
  });
}

/**
 * Filter emails by label
 */
export function filterByLabel(emails: Email[], label: string): Email[] {
  return emails.filter(email => email.labels.includes(label));
}

/**
 * Filter emails by read/unread status
 */
export function filterByReadStatus(emails: Email[], isRead: boolean): Email[] {
  return emails.filter(email => email.isRead === isRead);
}

/**
 * Filter emails by category
 */
export function filterByCategory(emails: Email[], category: GmailCategory): Email[] {
  return emails.filter(email => email.category === category);
}
