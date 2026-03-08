// @vitest-environment jsdom
/**
 * T005/T008/T009: Unit tests for useEmailSummary hook.
 * SummaryService is mocked — no real AI calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Email } from '../../../src/core/models/index.js';
import type { AiProviderConfig } from '../../../src/core/ai/provider.js';
import type { EmailSummary } from '../../../src/core/models/index.js';
import type { EmailCache } from '../../../src/core/cache/db.js';

// Mock SummaryService
const mockSummarize = vi.fn<[], Promise<EmailSummary>>();

vi.mock('../../../src/core/summary/service.js', () => ({
  SummaryService: vi.fn().mockImplementation(() => ({
    summarize: mockSummarize,
  })),
  SummaryGenerationError: class SummaryGenerationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'SummaryGenerationError';
    }
  },
}));

import { useEmailSummary } from '../../../src/tui/hooks/useEmailSummary.js';

const AI_CONFIG: AiProviderConfig = {
  provider: 'anthropic',
  model: 'claude-3-haiku-20240307',
  apiKey: 'test-key',
};

function makeEmail(id = 'email-1'): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email ${id}`,
    sender: { email: 'alice@example.com', name: 'Alice' },
    recipients: [],
    date: new Date(),
    snippet: 'Test snippet',
    bodyText: 'Test body',
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeSummary(emailId = 'email-1'): EmailSummary {
  return {
    emailId,
    oneSentence: 'This is a summary.',
    actionItems: ['Do something'],
    generatedAt: new Date(),
  };
}

function makeMockCache(initial?: EmailSummary | null) {
  const store = new Map<string, EmailSummary>();
  if (initial) store.set(initial.emailId, initial);
  return {
    getSummary: vi.fn((id: string) => store.get(id) ?? null),
    setSummary: vi.fn((id: string, s: EmailSummary) => { store.set(id, s); }),
  };
}

describe('useEmailSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in idle state', () => {
    const cache = makeMockCache();
    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );
    expect(result.current.summaryState.status).toBe('idle');
    expect(result.current.summaryState.summary).toBeNull();
    expect(result.current.summaryState.error).toBeNull();
  });

  it('cache hit → ready without AI call', () => {
    const email = makeEmail();
    const cached = makeSummary();
    const cache = makeMockCache(cached);

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    act(() => {
      result.current.requestSummary(email);
    });

    expect(result.current.summaryState.status).toBe('ready');
    expect(result.current.summaryState.summary).toEqual(cached);
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('cache miss → loading → ready', async () => {
    const email = makeEmail();
    const summary = makeSummary();
    const cache = makeMockCache(null);
    mockSummarize.mockResolvedValueOnce(summary);

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    act(() => {
      result.current.requestSummary(email);
    });

    expect(result.current.summaryState.status).toBe('loading');

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.summaryState.status).toBe('ready');
    expect(result.current.summaryState.summary).toEqual(summary);
    expect(cache.setSummary).toHaveBeenCalledWith(email.id, summary);
  });

  it('AI failure → error state with message', async () => {
    const email = makeEmail();
    const cache = makeMockCache(null);
    mockSummarize.mockRejectedValueOnce(new Error('API timeout'));

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    act(() => {
      result.current.requestSummary(email);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.summaryState.status).toBe('error');
    expect(result.current.summaryState.error).toBe('API timeout');
  });

  it('no-op when already loading', async () => {
    const email = makeEmail();
    const cache = makeMockCache(null);
    // Delay resolution so we can test the loading guard
    let resolve!: (s: EmailSummary) => void;
    mockSummarize.mockReturnValueOnce(new Promise(r => { resolve = r; }));

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    act(() => {
      result.current.requestSummary(email);
    });

    expect(result.current.summaryState.status).toBe('loading');

    // Second call while loading — should be no-op
    act(() => {
      result.current.requestSummary(email);
    });

    expect(mockSummarize).toHaveBeenCalledTimes(1);

    // Clean up
    await act(async () => {
      resolve(makeSummary());
      await Promise.resolve();
    });
  });

  it('reset() returns to idle', async () => {
    const email = makeEmail();
    const summary = makeSummary();
    const cache = makeMockCache(null);
    mockSummarize.mockResolvedValueOnce(summary);

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    act(() => { result.current.requestSummary(email); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.summaryState.status).toBe('ready');

    act(() => { result.current.reset(); });

    expect(result.current.summaryState.status).toBe('idle');
    expect(result.current.summaryState.summary).toBeNull();
    expect(result.current.summaryState.error).toBeNull();
  });

  it('no AI config → error "AI not configured"', () => {
    const email = makeEmail();
    const cache = makeMockCache(null);

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: null })
    );

    act(() => { result.current.requestSummary(email); });

    expect(result.current.summaryState.status).toBe('error');
    expect(result.current.summaryState.error).toBe('AI not configured');
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('retry after error → loading again', async () => {
    const email = makeEmail();
    const cache = makeMockCache(null);
    const summary = makeSummary();
    mockSummarize
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValueOnce(summary);

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    // First request → error
    act(() => { result.current.requestSummary(email); });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.summaryState.status).toBe('error');

    // Retry → loading → ready
    act(() => { result.current.requestSummary(email); });
    expect(result.current.summaryState.status).toBe('loading');

    await act(async () => { await Promise.resolve(); });
    expect(result.current.summaryState.status).toBe('ready');
  });
});
