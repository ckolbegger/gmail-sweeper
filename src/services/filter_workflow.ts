import type { Email } from '@/core/entities.js';
import { listEmails } from '@/services/email_list_service.js';
import { buildEmailFilters, type InboxFilterInput } from '@/services/filter_service.js';
import { renderInboxList } from '@/tui/inbox_list.js';

export { type InboxFilterInput };

export function runFilterWorkflow(emails: Email[], input: InboxFilterInput): string[] {
  const filters = buildEmailFilters(input);
  const filtered = listEmails(emails, filters);
  return renderInboxList(filtered);
}
