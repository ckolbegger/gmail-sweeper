/**
 * T042: useKeyboard hook - handles vim-style keyboard navigation (j/k, arrows, Enter, Page, Home/End).
 */

import { useState, useCallback } from 'react';
import { useInput, useApp } from 'ink';

interface UseKeyboardOptions {
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  pageSize?: number;
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
  pageSize = 10,
}: UseKeyboardOptions): UseKeyboardResult {
  const [index, setIndex] = useState(selectedIndex);
  const [previewScrollOffset, setPreviewScrollOffset] = useState(0);
  const { exit } = useApp();

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
    if (input === 'q') {
      exit();
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
