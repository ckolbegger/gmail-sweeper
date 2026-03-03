/**
 * T042: useKeyboard hook - handles vim-style keyboard navigation (j/k, arrows, Enter, Page, Home/End).
 */

import { useState, useCallback, useEffect } from 'react';
import { useInput, useApp } from 'ink';

interface UseKeyboardOptions {
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onRefresh?: () => void;
  pageSize?: number;
  onActivateFilter?: () => void;
  onClearFilter?: () => void;
  isFilterInputActive?: boolean;
  onArchive?: () => void;
  onDelete?: () => void;
  onLoadMore?: () => void;
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
  onActivateFilter,
  onClearFilter,
  isFilterInputActive = false,
  onArchive,
  onDelete,
  onLoadMore,
}: UseKeyboardOptions): UseKeyboardResult {
  const [index, setIndex] = useState(selectedIndex);
  const [previewScrollOffset, setPreviewScrollOffset] = useState(0);
  const { exit } = useApp();

  // Clamp index when itemCount changes (e.g. filter applied/cleared)
  useEffect(() => {
    setIndex(prev => Math.min(prev, Math.max(0, itemCount - 1)));
  }, [itemCount]);

  const clampIndex = useCallback((idx: number) => {
    return Math.max(0, Math.min(idx, itemCount - 1));
  }, [itemCount]);

  const handleKey = useCallback(
    (event: { key: string; ctrlKey?: boolean; shiftKey?: boolean }) => {
      const key = event.key;

      switch (key) {
        case 'j':
        case 'ArrowDown':
          setIndex(prev => clampIndex(prev + 1));
          break;

        case 'k':
        case 'ArrowUp':
          setIndex(prev => clampIndex(prev - 1));
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
          setIndex(prev => clampIndex(prev + pageSize));
          break;

        case 'PageUp':
          setIndex(prev => clampIndex(prev - pageSize));
          break;

        default:
          break;
      }
    },
    [index, itemCount, clampIndex, onSelect, pageSize]
  );

  // Wire into Ink's input system to capture keyboard events
  useInput((input, key) => {
    // When filter input is active, only handle Escape to cancel/clear
    if (isFilterInputActive) {
      if (key.escape) {
        onClearFilter?.();
      }
      return;
    }

    if (input === 'q') {
      exit();
      return;
    }

    // Escape to clear filter
    if (key.escape) {
      onClearFilter?.();
      return;
    }

    // f to activate filter (FR-001)
    if (input === 'f') {
      onActivateFilter?.();
      return;
    }

    // Ctrl+R to refresh
    if (input === 'r' && key.ctrl) {
      onRefresh?.();
      return;
    }

    // Ctrl+N to load more (next page)
    if (input === 'n' && key.ctrl) {
      onLoadMore?.();
      return;
    }

    // Preview scroll: [ up, ] down
    if (input === ']') {
      setPreviewScrollOffset(prev => prev + 3);
      return;
    }
    if (input === '[') {
      setPreviewScrollOffset(prev => Math.max(0, prev - 3));
      return;
    }

    // Action keys: archive and delete
    if (input === 'e' && itemCount > 0) {
      onArchive?.();
      return;
    }
    if (input === '#' && itemCount > 0) {
      onDelete?.();
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
