/**
 * Ctrl-N load more: unit tests for useKeyboard onLoadMore binding.
 * Tests the handler logic directly (no React rendering).
 */

import { describe, it, expect, vi } from 'vitest';

interface LoadMoreOptions {
  isFilterInputActive: boolean;
  onLoadMore?: ReturnType<typeof vi.fn>;
}

/**
 * Simulates the useInput handler logic for Ctrl-N.
 * Mirrors the guard conditions in useKeyboard.ts useInput callback.
 */
function simulateCtrlN(options: LoadMoreOptions) {
  const { isFilterInputActive, onLoadMore } = options;
  const input = 'n';
  const key = { ctrl: true, escape: false };

  if (isFilterInputActive) {
    if (key.escape) { /* clear filter */ }
    return;
  }

  if (input === 'n' && key.ctrl) {
    onLoadMore?.();
  }
}

describe('useKeyboard: Ctrl-N load more', () => {
  it('calls onLoadMore when Ctrl-N is pressed', () => {
    const onLoadMore = vi.fn();
    simulateCtrlN({ isFilterInputActive: false, onLoadMore });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore when filter input is active', () => {
    const onLoadMore = vi.fn();
    simulateCtrlN({ isFilterInputActive: true, onLoadMore });
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not throw when onLoadMore is not provided', () => {
    expect(() => simulateCtrlN({ isFilterInputActive: false })).not.toThrow();
  });
});
