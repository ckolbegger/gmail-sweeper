import type { Email } from '@/core/entities.js';
import { mapError, ValidationError } from '@/core/errors.js';
import type { InboxFilterInput } from '@/services/filter_service.js';
import { runFilterWorkflow } from '@/services/filter_workflow.js';

export interface InboxFilterResult {
  output: string[];
  error?: string;
}

export function applyInboxFilters(emails: Email[], input: InboxFilterInput): InboxFilterResult {
  try {
    if (!Array.isArray(emails)) {
      throw new ValidationError('Emails must be an array');
    }

    const output = runFilterWorkflow(emails, input);
    return { output };
  } catch (error) {
    const mapped = mapError(error);
    return {
      output: [`(error) ${mapped.message}`],
      error: mapped.message
    };
  }
}
