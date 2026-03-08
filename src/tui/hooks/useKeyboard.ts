/**
 * T042: useKeyboard hook - handles vim-style keyboard navigation (j/k, arrows, Enter, Page, Home/End).
 */

import { useState, useCallback } from 'react';
import { useInput, useApp } from 'ink';

interface UseKeyboardOptions {
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRefresh?: () => void;
  pageSize?: number;
  filterState?: 'idle' | 'input' | 'loading' | 'filtered' | 'error';
  onActivateFilter?: () => void;
  onClearFilter?: () => void;
  onArchive?: (emailId: string) => void;
  onDelete?: (emailId: string) => void;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
  getSelectedEmailId?: () => string | undefined;
  confirmationState?: 'idle' | 'confirming';
  onToggleSummary?: () => void;
}

interface UseKeyboardResult {
  selectedIndex: number;
  previewScrollOffset: number;
  handleKey: (event: { key: string; ctrlKey?: boolean; shiftKey?: boolean }) => void;
}

export function useKeyboard({
  itemCount,
  selectedIndex,
  onSelect,
  onRefresh,
  pageSize = 10,
  filterState = 'idle',
  onActivateFilter,
  onClearFilter,
  onArchive,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  getSelectedEmailId,
  confirmationState = 'idle',
  onToggleSummary,
}: UseKeyboardOptions): UseKeyboardResult {
  const [index, setIndex] = useState(selectedIndex);
  const [previewScrollOffset, setPreviewScrollOffset] = useState(0);
  const { exit } = useApp();

  const clampIndex = useCallback(
    (idx: number) => {
      return Math.max(0, Math.min(idx, itemCount - 1));
    },
    [itemCount]
  );

  const handleKey = useCallback(
    (event: { key: string; ctrlKey?: boolean; shiftKey?: boolean }) => {
      const key = event.key;

      switch (key) {
        case 'j':
        case 'ArrowDown':
          setIndex((prev) => clampIndex(prev + 1));
          break;

        case 'k':
        case 'ArrowUp':
          setIndex((prev) => clampIndex(prev - 1));
          break;

        case 'Enter':
          onSelect(index);
          break;

        case 'Home':
          setIndex(0);
          break;

        case 'End':
          setIndex(itemCount - 1);
          break;

        case 'PageDown':
          setIndex((prev) => clampIndex(prev + pageSize));
          break;

        case 'PageUp':
          setIndex((prev) => clampIndex(prev - pageSize));
          break;

        default:
          break;
      }
    },
    [index, itemCount, clampIndex, onSelect, pageSize]
  );

  // Wire into Ink's input system to capture keyboard events
  useInput((input, key) => {
    // During filter input mode, only handle Escape - let FilterInput handle other keys
    if (filterState === 'input' || filterState === 'loading') {
      if (key.escape) {
        onClearFilter?.();
      }
    }

    // 'f' to activate filter
    if (input === 'f') {
      onActivateFilter?.();
      return;
    }

    // Escape clears filter when filtered
    if (key.escape && filterState === 'filtered') {
      onClearFilter?.();
      return;
    }

    if (input === 'q') {
      exit();
      return;
    }

    // Ctrl+R to refresh
    if (input === 'r' && key.ctrl) {
      onRefresh?.();
      return;
    }

    // 'e' to archive selected email
    const selectedEmailId = getSelectedEmailId?.();
    if (input === 'e' && selectedEmailId && confirmationState !== 'confirming') {
      onArchive?.(selectedEmailId);
      return;
    }

    // '#' to delete selected email
    if (input === '#' && selectedEmailId && confirmationState !== 'confirming') {
      onDelete?.(selectedEmailId);
      return;
    }

    // 's' to toggle summary view
    if (input === 's') {
      onToggleSummary?.();
      return;
    }

    // Handle confirmation keys when in confirming state
    if (confirmationState === 'confirming') {
      if (input === 'y') {
        onConfirmDelete?.();
        return;
      }
      if (input === 'n' || key.escape) {
        onCancelDelete?.();
        return;
      }
    }

    // Preview scroll: [ up, ] down
    if (input === ']') {
      setPreviewScrollOffset((prev) => prev + 3);
      return;
    }
    if (input === '[') {
      setPreviewScrollOffset((prev) => Math.max(0, prev - 3));
      return;
    }

    // Navigation resets preview scroll
    if (key.downArrow || input === 'j') {
      setPreviewScrollOffset(0);
      handleKey({ key: 'ArrowDown' });
    } else if (key.upArrow || input === 'k') {
      setPreviewScrollOffset(0);
      handleKey({ key: 'ArrowUp' });
    } else if (key.return) {
      handleKey({ key: 'Enter' });
    } else if (key.pageDown) {
      setPreviewScrollOffset(0);
      handleKey({ key: 'PageDown' });
    } else if (key.pageUp) {
      setPreviewScrollOffset(0);
      handleKey({ key: 'PageUp' });
    }
  });

  return {
    selectedIndex: index,
    previewScrollOffset,
    handleKey,
  };
}
