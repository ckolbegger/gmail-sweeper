/**
 * T042: useKeyboard hook - handles vim-style keyboard navigation (j/k, arrows, Enter, Page, Home/End).
 */

import { useState, useCallback } from 'react';

interface UseKeyboardOptions {
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  pageSize?: number;
}

interface UseKeyboardResult {
  selectedIndex: number;
  handleKey: (event: { key: string; ctrlKey?: boolean; shiftKey?: boolean }) => void;
}

export function useKeyboard({
  itemCount,
  selectedIndex,
  onSelect,
  pageSize = 10,
}: UseKeyboardOptions): UseKeyboardResult {
  const [index, setIndex] = useState(selectedIndex);

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

  return {
    selectedIndex: index,
    handleKey,
  };
}
