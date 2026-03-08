import { describe, expect, it, vi } from 'vitest';

import {
  createPersistedSummaryFixture,
  createSummaryRequestFixture,
  createSummaryResponseFixture
} from './fixtures/ai_summary.fixtures.js';

import type { SummaryProvider } from '@/adapters/ai/provider.js';
import type {
  PersistedEmailSummary,
  SummaryStore
} from '@/adapters/storage/summary_store.js';
import type { SummaryObservabilityEvent } from '@/core/summary_observability.js';
import {
  createEmailSummaryService,
  normalizeActionItems,
  normalizeSummaryResponse,
  normalizeSummarySentence,
  renderSummaryDetailLines
} from '@/services/email_summary_service.js';

type SummaryStoreMock = SummaryStore & {
  getByMessageId: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

function createStoreMock(record: PersistedEmailSummary | null): SummaryStoreMock {
  const getByMessageId = vi.fn().mockResolvedValue(record);
  const upsert = vi.fn().mockResolvedValue(undefined);

  return { getByMessageId, upsert } as SummaryStoreMock;
}

describe('email summary service', () => {
  it('should return cached summary without calling provider', async () => {
    const cached = createPersistedSummaryFixture({ messageId: 'msg-cached' });
    const store = createStoreMock(cached);
    const provider: SummaryProvider = {
      summarizeEmail: vi.fn()
    };
    const service = createEmailSummaryService({
      provider,
      providerName: 'openai',
      model: 'gpt-4o-mini',
      store
    });

    const result = await service.getOrGenerateSummary({
      messageId: 'msg-cached'
    });

    expect(result).toEqual({ record: cached, cacheHit: true });
    expect(provider.summarizeEmail).not.toHaveBeenCalled();
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('should generate once, normalize, and persist when cache is missing', async () => {
    const store = createStoreMock(null);
    const provider: SummaryProvider = {
      summarizeEmail: vi.fn().mockResolvedValue(
        createSummaryResponseFixture({
          summarySentence: '  Review and confirm attendance. Please reply today. ',
          actionItems: ['  - Review the attached plan  ', '']
        })
      )
    };
    const service = createEmailSummaryService({
      provider,
      providerName: 'openai',
      model: 'gpt-4o-mini',
      store,
      now: () => new Date('2026-03-07T10:00:00.000Z')
    });

    const result = await service.getOrGenerateSummary(createSummaryRequestFixture());

    expect(result.cacheHit).toBe(false);
    expect(result.record).toMatchObject({
      messageId: 'msg-123',
      summarySentence: 'Review and confirm attendance.',
      actionItems: ['Review the attached plan'],
      provider: 'openai',
      model: 'gpt-4o-mini',
      createdAt: '2026-03-07T10:00:00.000Z'
    });
    expect(provider.summarizeEmail).toHaveBeenCalledOnce();
    expect(store.upsert).toHaveBeenCalledWith(result.record);
  });

  it('should normalize empty action item lists to "None"', async () => {
    const store = createStoreMock(null);
    const provider: SummaryProvider = {
      summarizeEmail: vi.fn().mockResolvedValue(
        createSummaryResponseFixture({
          actionItems: []
        })
      )
    };
    const service = createEmailSummaryService({
      provider,
      providerName: 'anthropic',
      model: 'claude-sonnet',
      store
    });

    const result = await service.getOrGenerateSummary(createSummaryRequestFixture({ messageId: 'msg-none' }));
    expect(result.record.actionItems).toEqual(['None']);
  });

  it('should not persist when provider fails', async () => {
    const store = createStoreMock(null);
    const provider: SummaryProvider = {
      summarizeEmail: vi.fn().mockRejectedValue(new Error('provider offline'))
    };
    const service = createEmailSummaryService({
      provider,
      providerName: 'openai',
      model: 'gpt-4o-mini',
      store
    });

    await expect(service.getOrGenerateSummary(createSummaryRequestFixture())).rejects.toThrow('provider offline');
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('should not persist malformed summaries', async () => {
    const store = createStoreMock(null);
    const provider: SummaryProvider = {
      summarizeEmail: vi.fn().mockResolvedValue(
        createSummaryResponseFixture({
          summarySentence: '   '
        })
      )
    };
    const service = createEmailSummaryService({
      provider,
      providerName: 'openai',
      model: 'gpt-4o-mini',
      store
    });

    await expect(service.getOrGenerateSummary(createSummaryRequestFixture())).rejects.toThrow(
      'Summary sentence is required'
    );
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('should emit structured observability events with redacted message id hints', async () => {
    const events: SummaryObservabilityEvent[] = [];
    const store = createStoreMock(null);
    const provider: SummaryProvider = {
      summarizeEmail: vi.fn().mockResolvedValue(createSummaryResponseFixture())
    };
    const service = createEmailSummaryService({
      provider,
      providerName: 'openai',
      model: 'gpt-4o-mini',
      store,
      observabilitySink: (event) => events.push(event)
    });

    await service.getOrGenerateSummary(createSummaryRequestFixture({ messageId: 'abcd1234efgh5678' }));

    expect(events.map((event) => event.event)).toEqual([
      'summary_cache_miss',
      'summary_generation_success'
    ]);
    for (const event of events) {
      expect(event.messageIdHint).toBe('abcd...5678');
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('should emit generation failure observability event', async () => {
    const events: SummaryObservabilityEvent[] = [];
    const store = createStoreMock(null);
    const provider: SummaryProvider = {
      summarizeEmail: vi.fn().mockRejectedValue(new Error('provider offline'))
    };
    const service = createEmailSummaryService({
      provider,
      providerName: 'openai',
      model: 'gpt-4o-mini',
      store,
      observabilitySink: (event) => events.push(event)
    });

    await expect(service.getOrGenerateSummary(createSummaryRequestFixture())).rejects.toThrow('provider offline');
    expect(events.map((event) => event.event)).toEqual([
      'summary_cache_miss',
      'summary_generation_failure'
    ]);
  });
});

describe('summary normalization helpers', () => {
  it('should keep only the first sentence and normalize bullets', () => {
    expect(normalizeSummarySentence('First sentence. Second sentence.')).toBe('First sentence.');
    expect(normalizeActionItems(['  - Prepare report', '   ', '* Send follow-up'])).toEqual([
      'Prepare report',
      'Send follow-up'
    ]);
  });

  it('should enforce fallback formatting for render output', () => {
    const normalized = normalizeSummaryResponse({
      summarySentence: 'Need a follow-up',
      actionItems: []
    });

    expect(normalized).toEqual({
      summarySentence: 'Need a follow-up.',
      actionItems: ['None']
    });
    expect(renderSummaryDetailLines(normalized)).toEqual(['Need a follow-up.', '- None']);
  });
});
