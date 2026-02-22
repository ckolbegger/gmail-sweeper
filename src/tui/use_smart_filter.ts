import type { AiProvider, EmailClassification } from '@/adapters/ai/provider.js';
import type { Email } from '@/core/entities.js';
import { mapError, ValidationError } from '@/core/errors.js';
import { runSmartFilter, type SmartFilterOptions } from '@/services/smart_filter_service.js';

export type FilterStatus = 'idle' | 'input' | 'loading' | 'filtered' | 'error';

export interface SmartFilterState {
  status: FilterStatus;
  draft: string;
  description: string;
  errorMessage?: string;
  visibleEmailIds: string[];
  totalEmails: number;
  matchingCount: number;
  summaryLine: string;
  confidenceByEmailId: Record<string, number>;
}

export interface SmartFilterController {
  state: SmartFilterState;
  beginInput: () => void;
  setDraft: (value: string) => void;
  submit: () => Promise<void>;
  clear: () => void;
}

export interface UseSmartFilterOptions {
  emails: Email[];
  provider: AiProvider | null;
  runSmartFilter?: (options: SmartFilterOptions) => Promise<{
    allResults: EmailClassification[];
    matchingResults: EmailClassification[];
    totalEvaluated: number;
  }>;
}

function buildDefaultState(emails: Email[]): SmartFilterState {
  return {
    status: 'idle',
    draft: '',
    description: '',
    errorMessage: undefined,
    visibleEmailIds: emails.map((email) => email.message_id),
    totalEmails: emails.length,
    matchingCount: emails.length,
    summaryLine: '',
    confidenceByEmailId: {}
  };
}

function buildConfidenceMap(results: EmailClassification[]): Record<string, number> {
  const confidenceByEmailId: Record<string, number> = {};
  for (const result of results) {
    confidenceByEmailId[result.emailId] = result.confidence;
  }
  return confidenceByEmailId;
}

function formatSummary(matchingCount: number, totalEmails: number): string {
  return `Filtered: ${matchingCount}/${totalEmails} emails`;
}

export function useSmartFilter(options: UseSmartFilterOptions): SmartFilterController {
  const controller: SmartFilterController = {
    state: buildDefaultState(options.emails),
    beginInput: () => undefined,
    setDraft: () => undefined,
    submit: async () => undefined,
    clear: () => undefined
  };

  const applyState = (next: SmartFilterState): void => {
    controller.state = next;
  };

  controller.beginInput = () => {
    applyState({
      ...controller.state,
      status: 'input',
      errorMessage: undefined
    });
  };

  controller.setDraft = (value: string) => {
    applyState({
      ...controller.state,
      status: controller.state.status === 'idle' ? 'input' : controller.state.status,
      draft: value
    });
  };

  controller.submit = async () => {
    const description = controller.state.draft.trim();
    if (description.length === 0) {
      applyState({
        ...controller.state,
        status: 'error',
        errorMessage: 'Filter description cannot be empty'
      });
      return;
    }

    if (!options.provider) {
      applyState({
        ...controller.state,
        status: 'error',
        errorMessage:
          'Smart filter requires AI_PROVIDER, AI_MODEL, and AI_API_KEY configuration.'
      });
      return;
    }

    applyState({
      ...controller.state,
      status: 'loading',
      errorMessage: undefined,
      description
    });

    const executeFilter = options.runSmartFilter ?? runSmartFilter;

    try {
      const result = await executeFilter({
        description,
        emails: options.emails,
        provider: options.provider
      });

      applyState({
        ...controller.state,
        status: 'filtered',
        description,
        draft: '',
        visibleEmailIds: result.matchingResults.map((entry) => entry.emailId),
        totalEmails: options.emails.length,
        matchingCount: result.matchingResults.length,
        summaryLine: formatSummary(result.matchingResults.length, options.emails.length),
        confidenceByEmailId: buildConfidenceMap(result.matchingResults)
      });
    } catch (error) {
      const mapped = mapError(error);
      const message =
        error instanceof ValidationError
          ? error.message
          : mapped.code === 'AI_PROVIDER_ERROR'
            ? mapped.message
            : 'Smart filter failed';

      applyState({
        ...controller.state,
        status: 'error',
        errorMessage: message
      });
    }
  };

  controller.clear = () => {
    applyState(buildDefaultState(options.emails));
  };

  return controller;
}
