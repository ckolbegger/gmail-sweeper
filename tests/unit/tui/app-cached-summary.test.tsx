/**
 * B002-T001: Tests for cache-aware view mode selection on email navigation.
 *
 * When navigating to an email:
 * - If a cached summary exists → open in 'summary' view and pass initialSummary to useEmailSummary
 * - If no cached summary → open in 'full' view with initialSummary undefined
 *
 * Strategy: mock useEmailSummary to spy on calls AND mock EmailPreview to capture viewMode.
 * The effect runs on mount (Ink debug:true is synchronous for renders, effects flush on act()).
 * We use a setImmediate-based flush to allow the effect → setState → re-render cycle to complete.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import type { UseEmailSummaryResult } from '../../../src/tui/hooks/useEmailSummary.js';

// --- Module mocks (must be before imports) ---

vi.mock('../../../src/tui/hooks/useGmail.js', () => ({
  useGmail: vi.fn(() => ({
    emails: [],
    isLoading: false,
    error: null,
    fetchEmailDetail: vi.fn(),
    refresh: vi.fn(),
    loadMore: vi.fn(),
    removeEmail: vi.fn(),
    restoreEmail: vi.fn(),
  })),
}));

vi.mock('../../../src/tui/hooks/useKeyboard.js', () => ({
  useKeyboard: vi.fn(() => ({
    selectedIndex: 0,
    previewScrollOffset: 0,
  })),
}));

vi.mock('../../../src/tui/hooks/useSmartFilter.js', () => ({
  useSmartFilter: vi.fn(() => ({
    status: 'idle',
    filteredEmails: [],
    filterDescription: '',
    error: null,
    progress: null,
    activateFilter: vi.fn(),
    clearFilter: vi.fn(),
    submitFilter: vi.fn(),
  })),
}));

vi.mock('../../../src/tui/hooks/useEmailActions.js', () => ({
  useEmailActions: vi.fn(() => ({
    archive: vi.fn(),
    delete: vi.fn(),
    actionError: null,
  })),
}));

const mockReset = vi.fn();
vi.mock('../../../src/tui/hooks/useEmailSummary.js', () => ({
  useEmailSummary: vi.fn((): UseEmailSummaryResult => ({
    summaryState: { status: 'idle', summary: null, error: null },
    requestSummary: vi.fn(),
    reset: mockReset,
  })),
}));

vi.mock('../../../src/core/ai/config.js', () => ({
  resolveAiConfig: vi.fn(() => null),
}));

// Track viewMode props passed to EmailPreview across renders
const capturedViewModes: string[] = [];
vi.mock('../../../src/tui/components/EmailPreview.js', () => ({
  EmailPreview: vi.fn((props: { viewMode?: string }) => {
    if (props.viewMode) capturedViewModes.push(props.viewMode);
    return null;
  }),
}));

vi.mock('../../../src/tui/components/EmailList.js', () => ({
  EmailList: vi.fn(() => null),
}));

vi.mock('../../../src/tui/components/FilterInput.js', () => ({
  FilterInput: vi.fn(() => null),
}));

// --- Imports after mocks ---

import React from 'react';
import { render } from 'ink-testing-library';
import { InboxApp } from '../../../src/tui/app.js';
import { useGmail } from '../../../src/tui/hooks/useGmail.js';
import { useKeyboard } from '../../../src/tui/hooks/useKeyboard.js';
import { useEmailSummary } from '../../../src/tui/hooks/useEmailSummary.js';
import type { Email, EmailSummary } from '../../../src/core/models/index.js';

// --- Helpers ---

function makeEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Subject ${id}`,
    sender: { email: 'sender@example.com', name: 'Sender' },
    recipients: [],
    date: new Date('2026-01-01T00:00:00Z'),
    snippet: `Snippet for ${id}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeSummary(emailId: string): EmailSummary {
  return {
    emailId,
    oneSentence: `Summary for ${emailId}`,
    actionItems: [],
    generatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

/** Flush effects and any synchronous re-renders in Ink's debug-mode renderer. */
async function flushEffects(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve));
}

const mockClient = {} as any;

// --- Tests ---

describe('B002-T001: cache-aware view mode on navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedViewModes.length = 0;
    // Default: no emails
    (useGmail as MockedFunction<typeof useGmail>).mockReturnValue({
      emails: [],
      isLoading: false,
      error: null,
      fetchEmailDetail: vi.fn(),
      refresh: vi.fn(),
      loadMore: vi.fn(),
      removeEmail: vi.fn(),
      restoreEmail: vi.fn(),
    } as any);
    (useKeyboard as MockedFunction<typeof useKeyboard>).mockReturnValue({
      selectedIndex: 0,
      previewScrollOffset: 0,
    } as any);
  });

  it('navigating to an email with a cached summary opens in summary view', async () => {
    const email = makeEmail('email-1');
    const summary = makeSummary('email-1');

    const mockGetSummary = vi.fn().mockReturnValue(summary);
    const mockCache = {
      getSummary: mockGetSummary,
      setSummary: vi.fn(),
      removeEmail: vi.fn(),
    } as any;

    (useGmail as MockedFunction<typeof useGmail>).mockReturnValue({
      emails: [email],
      isLoading: false,
      error: null,
      fetchEmailDetail: vi.fn(),
      refresh: vi.fn(),
      loadMore: vi.fn(),
      removeEmail: vi.fn(),
      restoreEmail: vi.fn(),
    } as any);

    render(<InboxApp client={mockClient} cache={mockCache} worker={null} />);
    await flushEffects();

    // cache.getSummary was called in the effect
    expect(mockGetSummary).toHaveBeenCalledWith('email-1');

    // After effect + re-render, useEmailSummary should have been called with initialSummary
    expect(useEmailSummary).toHaveBeenCalledWith(
      expect.objectContaining({ initialSummary: summary })
    );

    // And the view mode should have been set to 'summary' (passed to EmailPreview)
    expect(capturedViewModes).toContain('summary');
  });

  it('navigating to an email with no cached summary opens in full-detail view', async () => {
    const email = makeEmail('email-2');

    const mockGetSummary = vi.fn().mockReturnValue(null);
    const mockCache = {
      getSummary: mockGetSummary,
      setSummary: vi.fn(),
      removeEmail: vi.fn(),
    } as any;

    (useGmail as MockedFunction<typeof useGmail>).mockReturnValue({
      emails: [email],
      isLoading: false,
      error: null,
      fetchEmailDetail: vi.fn(),
      refresh: vi.fn(),
      loadMore: vi.fn(),
      removeEmail: vi.fn(),
      restoreEmail: vi.fn(),
    } as any);

    render(<InboxApp client={mockClient} cache={mockCache} worker={null} />);
    await flushEffects();

    expect(mockGetSummary).toHaveBeenCalledWith('email-2');

    // useEmailSummary must NOT have initialSummary in any call
    // (exactOptionalPropertyTypes: the key must be absent, not present with undefined)
    const calls = (useEmailSummary as MockedFunction<typeof useEmailSummary>).mock.calls;
    for (const [opts] of calls) {
      expect(opts).not.toHaveProperty('initialSummary');
    }

    // View mode should remain 'full'
    expect(capturedViewModes).not.toContain('summary');
    expect(capturedViewModes).toContain('full');
  });

  it('navigating between a summarised email and an unsummarised one resets correctly in both directions', async () => {
    const emailA = makeEmail('email-a');
    const emailB = makeEmail('email-b');
    const summaryA = makeSummary('email-a');

    const mockGetSummary = vi.fn((id: string) => (id === 'email-a' ? summaryA : null));
    const mockCache = {
      getSummary: mockGetSummary,
      setSummary: vi.fn(),
      removeEmail: vi.fn(),
    } as any;

    (useGmail as MockedFunction<typeof useGmail>).mockReturnValue({
      emails: [emailA, emailB],
      isLoading: false,
      error: null,
      fetchEmailDetail: vi.fn(),
      refresh: vi.fn(),
      loadMore: vi.fn(),
      removeEmail: vi.fn(),
      restoreEmail: vi.fn(),
    } as any);

    (useKeyboard as MockedFunction<typeof useKeyboard>).mockReturnValue({
      selectedIndex: 0,
      previewScrollOffset: 0,
    } as any);

    const { rerender } = render(
      <InboxApp client={mockClient} cache={mockCache} worker={null} />
    );
    await flushEffects();

    // Phase 1: emailA selected — cached summary → summary view
    expect(useEmailSummary).toHaveBeenCalledWith(
      expect.objectContaining({ initialSummary: summaryA })
    );
    expect(capturedViewModes).toContain('summary');

    // Reset tracking for phase 2
    vi.clearAllMocks();
    capturedViewModes.length = 0;

    // Phase 2: navigate to emailB — no summary → full view
    (useKeyboard as MockedFunction<typeof useKeyboard>).mockReturnValue({
      selectedIndex: 1,
      previewScrollOffset: 0,
    } as any);

    rerender(<InboxApp client={mockClient} cache={mockCache} worker={null} />);
    await flushEffects();

    // After the effect runs and flushes, the LAST call to useEmailSummary should
    // not have initialSummary (the initial render might still carry stale state,
    // but the re-render after setInitialSummary(undefined) must clear it).
    const callsAfterNav = (useEmailSummary as MockedFunction<typeof useEmailSummary>).mock.calls;
    const lastCallAfterNav = callsAfterNav[callsAfterNav.length - 1][0];
    expect(lastCallAfterNav).not.toHaveProperty('initialSummary');
    expect(capturedViewModes).toContain('full');

    // Reset tracking for phase 3
    vi.clearAllMocks();
    capturedViewModes.length = 0;

    // Phase 3: navigate back to emailA — has summary again
    (useKeyboard as MockedFunction<typeof useKeyboard>).mockReturnValue({
      selectedIndex: 0,
      previewScrollOffset: 0,
    } as any);

    rerender(<InboxApp client={mockClient} cache={mockCache} worker={null} />);
    await flushEffects();

    expect(useEmailSummary).toHaveBeenCalledWith(
      expect.objectContaining({ initialSummary: summaryA })
    );
    expect(capturedViewModes).toContain('summary');
  });
});
