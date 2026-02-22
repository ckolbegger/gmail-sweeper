// @vitest-environment jsdom
/**
 * T021: Unit tests for useSmartFilter hook.
 *
 * Tests state machine transitions: idle → input → loading → filtered | error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Email } from '../../../src/core/models/index.js';
import type { AiProviderConfig } from '../../../src/core/ai/provider.js';
import type { FilterResult } from '../../../src/core/filter/smart-filter.js';

// --- Module mocks ---

const mockResolveAiConfig = vi.fn<() => AiProviderConfig | null>();
const mockCreateAiProvider = vi.fn();
const mockRunSmartFilter = vi.fn<() => Promise<FilterResult>>();

vi.mock('../../../src/core/ai/config.js', () => ({
  resolveAiConfig: (...args: unknown[]) => mockResolveAiConfig(...(args as [])),
}));

vi.mock('../../../src/core/ai/provider.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/core/ai/provider.js')>();
  return {
    ...actual,
    createAiProvider: (...args: unknown[]) => mockCreateAiProvider(...args),
  };
});

vi.mock('../../../src/core/filter/smart-filter.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/core/filter/smart-filter.js')>();
  return {
    ...actual,
    runSmartFilter: (...args: unknown[]) => mockRunSmartFilter(...(args as [])),
  };
});

// Import after mocks
import { useSmartFilter } from '../../../src/tui/hooks/useSmartFilter.js';

function makeEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email ${id}`,
    sender: { email: `sender${id}@test.com`, name: `Sender ${id}` },
    recipients: [],
    date: new Date('2026-01-01'),
    snippet: `Snippet ${id}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

const defaultConfig: AiProviderConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
};

describe('useSmartFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAiConfig.mockReturnValue(defaultConfig);
    mockCreateAiProvider.mockReturnValue({ classifyEmails: vi.fn() });
  });

  it('initial state is idle with no filtered results', () => {
    const { result } = renderHook(() =>
      useSmartFilter({ emails: [makeEmail('1')] }),
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.filteredEmails).toEqual([]);
    expect(result.current.confidenceMap.size).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.filterDescription).toBe('');
  });

  it('activateFilter sets status to input', () => {
    const { result } = renderHook(() =>
      useSmartFilter({ emails: [] }),
    );

    act(() => {
      result.current.activateFilter();
    });

    expect(result.current.status).toBe('input');
  });

  it('submitFilter triggers evaluation — sets status to loading', async () => {
    // Make runSmartFilter hang so we can observe the loading state
    let resolveFilter!: (value: FilterResult) => void;
    mockRunSmartFilter.mockReturnValue(
      new Promise((resolve) => {
        resolveFilter = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useSmartFilter({ emails: [makeEmail('1')] }),
    );

    act(() => {
      result.current.activateFilter();
    });

    act(() => {
      result.current.submitFilter('newsletters');
    });

    expect(result.current.status).toBe('loading');
    expect(result.current.filterDescription).toBe('newsletters');

    // Clean up: resolve the pending promise
    await act(async () => {
      resolveFilter({
        allResults: [],
        matchingResults: [],
        totalEvaluated: 0,
      });
    });
  });

  it('successful evaluation updates filtered results and sets status to filtered', async () => {
    const emails = [makeEmail('1'), makeEmail('2'), makeEmail('3')];
    mockRunSmartFilter.mockResolvedValue({
      allResults: [
        { emailId: '1', matches: true, confidence: 0.9 },
        { emailId: '2', matches: false, confidence: 0.2 },
        { emailId: '3', matches: true, confidence: 0.7 },
      ],
      matchingResults: [
        { emailId: '1', matches: true, confidence: 0.9 },
        { emailId: '3', matches: true, confidence: 0.7 },
      ],
      totalEvaluated: 3,
    });

    const { result } = renderHook(() => useSmartFilter({ emails }));

    act(() => {
      result.current.activateFilter();
    });

    await act(async () => {
      result.current.submitFilter('important emails');
    });

    expect(result.current.status).toBe('filtered');
    expect(result.current.filteredEmails).toHaveLength(2);
    // Sorted by confidence: email 1 (0.9), email 3 (0.7)
    expect(result.current.filteredEmails[0]!.id).toBe('1');
    expect(result.current.filteredEmails[1]!.id).toBe('3');
    expect(result.current.confidenceMap.get('1')).toBe('high');
    expect(result.current.confidenceMap.get('3')).toBe('medium');
  });

  it('error during evaluation preserves unfiltered view and sets status to error', async () => {
    const emails = [makeEmail('1')];
    mockRunSmartFilter.mockRejectedValue(new Error('AI provider failed'));

    const { result } = renderHook(() => useSmartFilter({ emails }));

    act(() => {
      result.current.activateFilter();
    });

    await act(async () => {
      result.current.submitFilter('test');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('AI provider failed');
    // Filtered emails should be empty (preserve unfiltered view — caller uses original emails)
    expect(result.current.filteredEmails).toEqual([]);
  });

  it('clearFilter restores idle state', async () => {
    const emails = [makeEmail('1')];
    mockRunSmartFilter.mockResolvedValue({
      allResults: [{ emailId: '1', matches: true, confidence: 0.8 }],
      matchingResults: [{ emailId: '1', matches: true, confidence: 0.8 }],
      totalEvaluated: 1,
    });

    const { result } = renderHook(() => useSmartFilter({ emails }));

    act(() => {
      result.current.activateFilter();
    });

    await act(async () => {
      result.current.submitFilter('test');
    });

    expect(result.current.status).toBe('filtered');

    act(() => {
      result.current.clearFilter();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.filteredEmails).toEqual([]);
    expect(result.current.confidenceMap.size).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.filterDescription).toBe('');
  });

  it('initial progress is null', () => {
    const { result } = renderHook(() =>
      useSmartFilter({ emails: [makeEmail('1')] }),
    );
    expect(result.current.progress).toBeNull();
  });

  it('progress updates during evaluation via onProgress callback', async () => {
    const emails = [makeEmail('1'), makeEmail('2'), makeEmail('3')];
    const progressSnapshots: Array<{ evaluatedCount: number; totalCount: number; percent: number }> = [];

    // Capture the onProgress callback and invoke it manually
    mockRunSmartFilter.mockImplementation(async (opts: { onProgress?: (p: { evaluatedCount: number; totalCount: number }) => void }) => {
      opts.onProgress?.({ evaluatedCount: 1, totalCount: 3, currentBatch: 1, totalBatches: 3, matchingResults: [] });
      opts.onProgress?.({ evaluatedCount: 2, totalCount: 3, currentBatch: 2, totalBatches: 3, matchingResults: [] });
      opts.onProgress?.({ evaluatedCount: 3, totalCount: 3, currentBatch: 3, totalBatches: 3, matchingResults: [] });
      return { allResults: [], matchingResults: [], totalEvaluated: 3 };
    });

    const { result } = renderHook(() => {
      const hook = useSmartFilter({ emails });
      if (hook.progress) progressSnapshots.push({ ...hook.progress });
      return hook;
    });

    act(() => { result.current.activateFilter(); });
    await act(async () => { result.current.submitFilter('test'); });

    // Should have received progress updates
    expect(progressSnapshots.length).toBeGreaterThan(0);
    // Final progress should show 100%
    const last = progressSnapshots[progressSnapshots.length - 1]!;
    expect(last.evaluatedCount).toBe(3);
    expect(last.totalCount).toBe(3);
    expect(last.percent).toBe(100);
  });

  it('progress resets to null after clearFilter', async () => {
    const emails = [makeEmail('1')];
    mockRunSmartFilter.mockImplementation(async (opts: { onProgress?: (p: { evaluatedCount: number; totalCount: number }) => void }) => {
      opts.onProgress?.({ evaluatedCount: 1, totalCount: 1, currentBatch: 1, totalBatches: 1, matchingResults: [] });
      return {
        allResults: [{ emailId: '1', matches: true, confidence: 0.8 }],
        matchingResults: [{ emailId: '1', matches: true, confidence: 0.8 }],
        totalEvaluated: 1,
      };
    });

    const { result } = renderHook(() => useSmartFilter({ emails }));

    act(() => { result.current.activateFilter(); });
    await act(async () => { result.current.submitFilter('test'); });
    expect(result.current.progress).toBeNull(); // cleared after completion

    act(() => { result.current.clearFilter(); });
    expect(result.current.progress).toBeNull();
  });

  it('submitFilter with empty string sets error before AI config check', () => {
    const { result } = renderHook(() =>
      useSmartFilter({ emails: [makeEmail('1')] }),
    );

    act(() => {
      result.current.submitFilter('');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Filter description cannot be empty');
    expect(mockResolveAiConfig).not.toHaveBeenCalled();
  });

  it('submitFilter with whitespace-only string sets error before AI config check', () => {
    const { result } = renderHook(() =>
      useSmartFilter({ emails: [makeEmail('1')] }),
    );

    act(() => {
      result.current.submitFilter('   ');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Filter description cannot be empty');
    expect(mockResolveAiConfig).not.toHaveBeenCalled();
  });

  it('missing AI config error includes actionable guidance', async () => {
    mockResolveAiConfig.mockReturnValue(null);

    const { result } = renderHook(() =>
      useSmartFilter({ emails: [makeEmail('1')] }),
    );

    act(() => {
      result.current.activateFilter();
    });

    await act(async () => {
      result.current.submitFilter('test filter');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('Set AI_PROVIDER and AI_API_KEY environment variables');
  });

  it('missing AI config shows error message (FR-017)', async () => {
    mockResolveAiConfig.mockReturnValue(null);

    const { result } = renderHook(() =>
      useSmartFilter({ emails: [makeEmail('1')] }),
    );

    act(() => {
      result.current.activateFilter();
    });

    await act(async () => {
      result.current.submitFilter('test filter');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/not configured/i);
    expect(mockRunSmartFilter).not.toHaveBeenCalled();
  });
});
