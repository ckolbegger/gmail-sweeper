export interface EmailRecord {
  messageId: string;
  subject: string;
  sender: string;
  receivedAt: number;
  labels: string[];
  category: string;
  isRead: boolean;
}

export interface EmailFilters {
  sender?: string;
  dateFrom?: number;
  dateTo?: number;
  label?: string;
  category?: string;
}

function matchesSender(email: EmailRecord, sender?: string): boolean {
  if (!sender) return true;
  return email.sender.toLowerCase() === sender.toLowerCase();
}

function matchesDate(email: EmailRecord, dateFrom?: number, dateTo?: number): boolean {
  if (dateFrom && email.receivedAt < dateFrom) return false;
  if (dateTo && email.receivedAt > dateTo) return false;
  return true;
}

function matchesLabel(email: EmailRecord, label?: string): boolean {
  if (!label) return true;
  return email.labels.includes(label);
}

function matchesCategory(email: EmailRecord, category?: string): boolean {
  if (!category) return true;
  return email.category === category;
}

export function listEmails(emails: EmailRecord[], filters: EmailFilters = {}): EmailRecord[] {
  return emails.filter((email) => {
    return (
      matchesSender(email, filters.sender) &&
      matchesDate(email, filters.dateFrom, filters.dateTo) &&
      matchesLabel(email, filters.label) &&
      matchesCategory(email, filters.category)
    );
  });
}
