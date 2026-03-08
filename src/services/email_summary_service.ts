import type {
  SummarizeEmailResponse,
  SummaryProvider
} from '@/adapters/ai/provider.js';
import type {
  PersistedEmailSummary,
  SummaryStore
} from '@/adapters/storage/summary_store.js';
import { ValidationError } from '@/core/errors.js';
import {
  emitSummaryObservabilityEvent,
  redactMessageId,
  type SummaryObservabilitySink
} from '@/core/summary_observability.js';

export interface GetOrGenerateSummaryRequest {
  messageId: string;
  subject?: string;
  sender?: string;
  body?: string;
}

export interface GetOrGenerateSummaryResult {
  record: PersistedEmailSummary;
  cacheHit: boolean;
}

export interface EmailSummaryService {
  getOrGenerateSummary(request: GetOrGenerateSummaryRequest): Promise<GetOrGenerateSummaryResult>;
}

export interface CreateEmailSummaryServiceOptions {
  provider: SummaryProvider;
  providerName: PersistedEmailSummary['provider'];
  model: string;
  store: SummaryStore;
  observabilitySink?: SummaryObservabilitySink;
  now?: () => Date;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeSummarySentence(input: string): string {
  const normalized = collapseWhitespace(input);
  if (normalized.length === 0) {
    throw new ValidationError('Summary sentence is required');
  }

  const firstSentence = normalized.match(/^.+?[.!?](?=\s|$)/)?.[0];
  if (firstSentence) {
    return firstSentence.trim();
  }

  return `${normalized}.`;
}

export function normalizeActionItems(input: string[]): string[] {
  const cleaned = input
    .map((item) => collapseWhitespace(item.replace(/^\s*[*•-]\s*/, '')))
    .filter((item) => item.length > 0);

  return cleaned.length > 0 ? cleaned : ['None'];
}

export function normalizeSummaryResponse(response: SummarizeEmailResponse): SummarizeEmailResponse {
  return {
    summarySentence: normalizeSummarySentence(response.summarySentence),
    actionItems: normalizeActionItems(response.actionItems)
  };
}

export function renderSummaryDetailLines(summary: {
  summarySentence: string;
  actionItems: string[];
}): string[] {
  return [summary.summarySentence, ...summary.actionItems.map((item) => `- ${item}`)];
}

export function createEmailSummaryService(options: CreateEmailSummaryServiceOptions): EmailSummaryService {
  const now = options.now ?? (() => new Date());

  return {
    async getOrGenerateSummary(
      request: GetOrGenerateSummaryRequest
    ): Promise<GetOrGenerateSummaryResult> {
      const messageId = request.messageId.trim();
      if (messageId.length === 0) {
        throw new ValidationError('messageId is required');
      }

      const cached = await options.store.getByMessageId(messageId);
      if (cached) {
        emitSummaryObservabilityEvent(options.observabilitySink, {
          event: 'summary_cache_hit',
          messageIdHint: redactMessageId(messageId),
          details: {
            provider: cached.provider,
            model: cached.model
          }
        });
        return {
          record: cached,
          cacheHit: true
        };
      }
      emitSummaryObservabilityEvent(options.observabilitySink, {
        event: 'summary_cache_miss',
        messageIdHint: redactMessageId(messageId),
        details: {
          provider: options.providerName,
          model: options.model
        }
      });

      const subject = request.subject?.trim() ?? '';
      const sender = request.sender?.trim() ?? '';
      const body = request.body?.trim() ?? '';
      if (subject.length === 0 || sender.length === 0 || body.length === 0) {
        throw new ValidationError('Summary generation requires subject, sender, and body');
      }

      let generated: SummarizeEmailResponse;
      try {
        generated = await options.provider.summarizeEmail({
          messageId,
          subject,
          sender,
          body
        });
      } catch (error) {
        emitSummaryObservabilityEvent(options.observabilitySink, {
          event: 'summary_generation_failure',
          messageIdHint: redactMessageId(messageId),
          details: {
            provider: options.providerName,
            model: options.model,
            reason: error instanceof Error ? error.message : String(error)
          }
        });
        throw error;
      }
      const normalized = normalizeSummaryResponse(generated);

      const record: PersistedEmailSummary = {
        messageId,
        summarySentence: normalized.summarySentence,
        actionItems: normalized.actionItems,
        provider: options.providerName,
        model: options.model,
        createdAt: now().toISOString()
      };

      await options.store.upsert(record);
      emitSummaryObservabilityEvent(options.observabilitySink, {
        event: 'summary_generation_success',
        messageIdHint: redactMessageId(messageId),
        details: {
          provider: options.providerName,
          model: options.model,
          actionItemCount: record.actionItems.length
        }
      });
      return {
        record,
        cacheHit: false
      };
    }
  };
}
