import type { EmailFilters } from '@/services/email_list_service.js';

export interface InboxFilterInput {
  sender?: string;
  dateFrom?: number;
  dateTo?: number;
  label?: string;
  category?: string;
}

const isBlank = (value?: string): boolean => !value || value.trim().length === 0;

export function buildEmailFilters(input: InboxFilterInput): EmailFilters {
  return {
    sender: isBlank(input.sender) ? undefined : input.sender,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    label: isBlank(input.label) ? undefined : input.label,
    category: isBlank(input.category) ? undefined : input.category
  };
}
