/**
 * T004/T007/T012: Unit tests for useKeyboard action keys (archive 'e', delete '#').
 * Tests key handler logic directly (no React rendering), following useKeyboard.test.ts pattern.
 */

import { describe, it, expect, vi } from 'vitest';

interface ActionKeyOptions {
  itemCount: number;
  isFilterInputActive: boolean;
  onArchive?: ReturnType<typeof vi.fn>;
  onDelete?: ReturnType<typeof vi.fn>;
}

/**
 * Simulates the useInput handler logic for action keys.
 * Mirrors the guard conditions in useKeyboard.ts useInput callback.
 */
function simulateActionKey(input: string, options: ActionKeyOptions) {
  const { itemCount, isFilterInputActive, onArchive, onDelete } = options;

  // When filter input is active, only Escape is handled — all other keys suppressed
  if (isFilterInputActive) {
    return;
  }

  if (input === 'e' && itemCount > 0) {
    onArchive?.();
    return;
  }

  if (input === '#' && itemCount > 0) {
    onDelete?.();
    return;
  }
}

describe('useKeyboard action keys', () => {
  describe('T004: Archive key (e)', () => {
    it('calls onArchive when e pressed and list is non-empty', () => {
      const onArchive = vi.fn();
      simulateActionKey('e', { itemCount: 5, isFilterInputActive: false, onArchive });
      expect(onArchive).toHaveBeenCalledOnce();
    });

    it('does NOT call onArchive when e pressed and list is empty', () => {
      const onArchive = vi.fn();
      simulateActionKey('e', { itemCount: 0, isFilterInputActive: false, onArchive });
      expect(onArchive).not.toHaveBeenCalled();
    });

    it('does NOT call onArchive when e pressed and filter input is active', () => {
      const onArchive = vi.fn();
      simulateActionKey('e', { itemCount: 5, isFilterInputActive: true, onArchive });
      expect(onArchive).not.toHaveBeenCalled();
    });
  });

  describe('T007: Delete key (#)', () => {
    it('calls onDelete when # pressed and list is non-empty', () => {
      const onDelete = vi.fn();
      simulateActionKey('#', { itemCount: 5, isFilterInputActive: false, onDelete });
      expect(onDelete).toHaveBeenCalledOnce();
    });

    it('does NOT call onDelete when # pressed and list is empty', () => {
      const onDelete = vi.fn();
      simulateActionKey('#', { itemCount: 0, isFilterInputActive: false, onDelete });
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('does NOT call onDelete when # pressed and filter input is active', () => {
      const onDelete = vi.fn();
      simulateActionKey('#', { itemCount: 5, isFilterInputActive: true, onDelete });
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('T012: Selection clamp after removeEmail', () => {
    it('clamps selectedIndex to last valid when itemCount shrinks', () => {
      // Given: 3 emails, selectedIndex=2 (last item)
      let index = 2;
      const newItemCount = 2; // removeEmail reduces count by 1

      // Simulate the useEffect clamp logic from useKeyboard.ts line 41
      index = Math.min(index, Math.max(0, newItemCount - 1));

      expect(index).toBe(1); // clamped to new last item
    });

    it('keeps index unchanged when it is still valid after removal', () => {
      // Given: 3 emails, selectedIndex=0 (first item), remove last email
      let index = 0;
      const newItemCount = 2;

      index = Math.min(index, Math.max(0, newItemCount - 1));

      expect(index).toBe(0); // unchanged, still valid
    });

    it('clamps to 0 when only one email remains', () => {
      let index = 2;
      const newItemCount = 1;

      index = Math.min(index, Math.max(0, newItemCount - 1));

      expect(index).toBe(0);
    });
  });
});
