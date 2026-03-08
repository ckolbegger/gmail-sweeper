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
    setSummary: vi.fn((s: EmailSummary) => { store.set(s.emailId, s); }),
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
    expect(cache.setSummary).toHaveBeenCalledWith(summary);
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

  it('stale promise ignored after reset()', async () => {
    const emailA = makeEmail('email-a');
    const cache = makeMockCache(null);
    let resolveA!: (s: EmailSummary) => void;
    mockSummarize.mockReturnValueOnce(new Promise(r => { resolveA = r; }));

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    // Start loading email A
    act(() => { result.current.requestSummary(emailA); });
    expect(result.current.summaryState.status).toBe('loading');

    // Navigate away — reset invalidates the in-flight request
    act(() => { result.current.reset(); });
    expect(result.current.summaryState.status).toBe('idle');

    // Resolve email A's stale promise
    await act(async () => {
      resolveA(makeSummary('email-a'));
      await Promise.resolve();
    });

    // State must stay idle, not flip to 'ready' with email A's summary
    expect(result.current.summaryState.status).toBe('idle');
    expect(cache.setSummary).not.toHaveBeenCalled();
  });

  it('stale promise does not overwrite second request', async () => {
    const emailA = makeEmail('email-a');
    const emailB = makeEmail('email-b');
    const summaryA = makeSummary('email-a');
    const summaryB = makeSummary('email-b');
    const cache = makeMockCache(null);

    let resolveA!: (s: EmailSummary) => void;
    let resolveB!: (s: EmailSummary) => void;
    mockSummarize
      .mockReturnValueOnce(new Promise(r => { resolveA = r; }))
      .mockReturnValueOnce(new Promise(r => { resolveB = r; }));

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    // Start loading email A
    act(() => { result.current.requestSummary(emailA); });
    expect(result.current.summaryState.status).toBe('loading');

    // Navigate away and start loading email B
    act(() => { result.current.reset(); });
    act(() => { result.current.requestSummary(emailB); });
    expect(result.current.summaryState.status).toBe('loading');

    // Email A resolves first (stale) — state must stay 'loading', not flip to 'ready' with A's summary
    await act(async () => {
      resolveA(summaryA);
      await Promise.resolve();
    });
    expect(result.current.summaryState.status).toBe('loading');

    // Email B resolves — state should become 'ready' with B's summary
    await act(async () => {
      resolveB(summaryB);
      await Promise.resolve();
    });
    expect(result.current.summaryState.status).toBe('ready');
    expect(result.current.summaryState.summary?.emailId).toBe('email-b');
  });

  it('stale finally does not clear isLoadingRef for active request', async () => {
    const emailA = makeEmail('email-a');
    const emailB = makeEmail('email-b');
    const cache = makeMockCache(null);

    let resolveA!: (s: EmailSummary) => void;
    let resolveB!: (s: EmailSummary) => void;
    mockSummarize
      .mockReturnValueOnce(new Promise(r => { resolveA = r; }))
      .mockReturnValueOnce(new Promise(r => { resolveB = r; }));

    const { result } = renderHook(() =>
      useEmailSummary({ cache: cache as unknown as EmailCache, aiConfig: AI_CONFIG })
    );

    // Start loading A, reset, start loading B
    act(() => { result.current.requestSummary(emailA); });
    act(() => { result.current.reset(); });
    act(() => { result.current.requestSummary(emailB); });

    // Resolve A (stale) — its finally should NOT clear B's loading guard
    await act(async () => {
      resolveA(makeSummary('email-a'));
      await Promise.resolve();
    });

    // B is still loading — a third requestSummary call should be a no-op (guard still active)
    act(() => { result.current.requestSummary(emailB); });
    // Only 2 calls total (A and B), not 3
    expect(mockSummarize).toHaveBeenCalledTimes(2);

    // Clean up B
    await act(async () => {
      resolveB(makeSummary('email-b'));
      await Promise.resolve();
    });
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
