/**
 * Email Filter
 *
 * Handles filtering of emails by various criteria.
 */

import type { Email } from '../models/email.js';

export class EmailFilter {
  /**
   * Filter emails by sender email address
   */
  filterBySender(emails: Email[], senderEmail: string): Email[] {
    const lowerSender = senderEmail.toLowerCase();
    return emails.filter(email => email.sender.email.toLowerCase() === lowerSender);
  }

  /**
   * Filter emails by date range
   */
  filterByDateRange(emails: Email[], startDate: Date, endDate: Date): Email[] {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return emails.filter(email => {
      const emailTime = email.dateReceived?.getTime() ?? 0;
      return emailTime >= start && emailTime <= end;
    });
  }

  /**
   * Filter emails by label
   */
  filterByLabel(emails: Email[], label: string): Email[] {
    return emails.filter(email => email.labels.includes(label));
  }

  /**
   * Filter emails by read status
   */
  filterByReadStatus(emails: Email[], isRead: boolean): Email[] {
    return emails.filter(email => email.isRead === isRead);
  }

  /**
   * Combine multiple filters with AND logic
   * Each filter function takes the email list and returns a filtered list
   */
  combine(emails: Email[], filters: ((emails: Email[]) => Email[])[]): Email[] {
    return filters.reduce((acc, filter) => filter(acc), emails);
  }
}
