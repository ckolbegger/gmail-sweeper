import type { SummarizeEmailRequest, SummarizeEmailResponse } from '@/adapters/ai/provider.js';
import type { PersistedEmailSummary } from '@/adapters/storage/summary_store.js';

export function createSummaryRequestFixture(
  overrides: Partial<SummarizeEmailRequest> = {}
): SummarizeEmailRequest {
  return {
    messageId: 'msg-123',
    subject: 'Quarterly planning update',
    sender: 'manager@example.com',
    body: 'Please review the plan by Friday. Send feedback and confirm your attendance.',
    ...overrides
  };
}

export function createSummaryResponseFixture(
  overrides: Partial<SummarizeEmailResponse> = {}
): SummarizeEmailResponse {
  return {
    summarySentence: 'The email asks for plan review and attendance confirmation.',
    actionItems: ['Review the plan by Friday', 'Send feedback', 'Confirm attendance'],
    ...overrides
  };
}

export function createPersistedSummaryFixture(
  overrides: Partial<PersistedEmailSummary> = {}
): PersistedEmailSummary {
  return {
    messageId: 'msg-123',
    summarySentence: 'The email asks for plan review and attendance confirmation.',
    actionItems: ['Review the plan by Friday', 'Send feedback', 'Confirm attendance'],
    provider: 'openai',
    model: 'gpt-4o-mini',
    createdAt: '2026-03-07T00:00:00.000Z',
    ...overrides
  };
}
