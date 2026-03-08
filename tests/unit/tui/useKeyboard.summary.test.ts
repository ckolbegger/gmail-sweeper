/**
 * T007: Unit tests for useKeyboard 's' key → onToggleSummary.
 * Follows the direct logic simulation pattern from useKeyboard.actions.test.ts.
 */

import { describe, it, expect, vi } from 'vitest';

interface SummaryKeyOptions {
  itemCount: number;
  isFilterInputActive: boolean;
  onToggleSummary?: ReturnType<typeof vi.fn>;
}

/**
 * Simulates the useInput handler logic for the 's' key.
 * Mirrors the guard conditions in useKeyboard.ts useInput callback.
 */
function simulateSummaryKey(input: string, options: SummaryKeyOptions) {
  const { itemCount, isFilterInputActive, onToggleSummary } = options;

  if (isFilterInputActive) {
    return;
  }

  if (input === 's' && itemCount > 0) {
    onToggleSummary?.();
    return;
  }
}

describe('useKeyboard summary toggle (s key)', () => {
  it('calls onToggleSummary when s pressed and list is non-empty', () => {
    const onToggleSummary = vi.fn();
    simulateSummaryKey('s', { itemCount: 3, isFilterInputActive: false, onToggleSummary });
    expect(onToggleSummary).toHaveBeenCalledOnce();
  });

  it('does NOT call onToggleSummary when s pressed and list is empty', () => {
    const onToggleSummary = vi.fn();
    simulateSummaryKey('s', { itemCount: 0, isFilterInputActive: false, onToggleSummary });
    expect(onToggleSummary).not.toHaveBeenCalled();
  });

  it('does NOT call onToggleSummary when s pressed and filter input is active', () => {
    const onToggleSummary = vi.fn();
    simulateSummaryKey('s', { itemCount: 5, isFilterInputActive: true, onToggleSummary });
    expect(onToggleSummary).not.toHaveBeenCalled();
  });

  it('second s press also calls onToggleSummary (bidirectional toggle driven by caller)', () => {
    const onToggleSummary = vi.fn();
    simulateSummaryKey('s', { itemCount: 5, isFilterInputActive: false, onToggleSummary });
    simulateSummaryKey('s', { itemCount: 5, isFilterInputActive: false, onToggleSummary });
    expect(onToggleSummary).toHaveBeenCalledTimes(2);
  });

  it('handleToggleSummary is not invoked by keyboard when itemCount is 0 (R004)', () => {
    // The keyboard guard (itemCount > 0) prevents calls to handleToggleSummary
    // when no email is selected, so detailViewMode is never set to 'summary'.
    // This mirrors the guard also present directly in handleToggleSummary (app.tsx).
    const onToggleSummary = vi.fn();
    simulateSummaryKey('s', { itemCount: 0, isFilterInputActive: false, onToggleSummary });
    expect(onToggleSummary).not.toHaveBeenCalled();
  });
});
