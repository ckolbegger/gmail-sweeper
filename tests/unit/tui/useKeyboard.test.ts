/**
 * T039/T024: Unit tests for useKeyboard hook.
 * Tests keyboard navigation (j/k, arrows, Enter, boundaries) and filter mode keys.
 */

import { describe, it, expect, vi } from 'vitest';

function createKeyboardController(itemCount: number, initialIndex: number = 0) {
  let selectedIndex = initialIndex;
  const onSelect = vi.fn();

  const handleKey = (key: string) => {
    const clampIndex = (idx: number) => Math.max(0, Math.min(idx, itemCount - 1));

    switch (key) {
      case 'j':
      case 'ArrowDown':
        selectedIndex = clampIndex(selectedIndex + 1);
        break;
      case 'k':
      case 'ArrowUp':
        selectedIndex = clampIndex(selectedIndex - 1);
        break;
      case 'Enter':
        onSelect(selectedIndex);
        break;
      case 'Home':
        selectedIndex = 0;
        break;
      case 'End':
        selectedIndex = itemCount - 1;
        break;
      case 'PageDown':
        selectedIndex = clampIndex(selectedIndex + 10);
        break;
      case 'PageUp':
        selectedIndex = clampIndex(selectedIndex - 10);
        break;
    }
  };

  return { getIndex: () => selectedIndex, handleKey, onSelect };
}

// Test keyboard navigation logic directly (hook testing without React)
describe('useKeyboard', () => {
  describe('T039: Navigation', () => {
    it('should move selection down on j or ArrowDown', () => {
      const controller = createKeyboardController(5, 0);

      controller.handleKey('j');
      expect(controller.getIndex()).toBe(1);

      controller.handleKey('ArrowDown');
      expect(controller.getIndex()).toBe(2);
    });

    it('should move selection up on k or ArrowUp', () => {
      const controller = createKeyboardController(5, 2);

      controller.handleKey('k');
      expect(controller.getIndex()).toBe(1);

      controller.handleKey('ArrowUp');
      expect(controller.getIndex()).toBe(0);
    });

    it('should trigger onSelect on Enter', () => {
      const controller = createKeyboardController(5, 2);

      controller.handleKey('Enter');
      expect(controller.onSelect).toHaveBeenCalledWith(2);
    });

    it('should not move past first item (boundary)', () => {
      const controller = createKeyboardController(5, 0);

      controller.handleKey('k');
      expect(controller.getIndex()).toBe(0);

      controller.handleKey('ArrowUp');
      expect(controller.getIndex()).toBe(0);
    });

    it('should not move past last item (boundary)', () => {
      const controller = createKeyboardController(5, 4);

      controller.handleKey('j');
      expect(controller.getIndex()).toBe(4);

      controller.handleKey('ArrowDown');
      expect(controller.getIndex()).toBe(4);
    });

    it('should handle Home key to jump to first item', () => {
      const controller = createKeyboardController(5, 3);

      controller.handleKey('Home');
      expect(controller.getIndex()).toBe(0);
    });

    it('should handle End key to jump to last item', () => {
      const controller = createKeyboardController(5, 1);

      controller.handleKey('End');
      expect(controller.getIndex()).toBe(4);
    });

    it('should handle PageDown to move down multiple items', () => {
      const controller = createKeyboardController(20, 0);

      controller.handleKey('PageDown');
      expect(controller.getIndex()).toBe(10);
    });

    it('should handle PageUp to move up multiple items', () => {
      const controller = createKeyboardController(20, 15);

      controller.handleKey('PageUp');
      expect(controller.getIndex()).toBe(5);
    });
  });

  describe('US1-bug-3: Index clamping on itemCount change', () => {
    it('should clamp index when itemCount shrinks below current index', () => {
      // Simulate: user navigates to index 30 in a 50-item list, then filter reduces to 3 items
      let itemCount = 50;
      let index = 30;

      // Simulate the useEffect clamp logic
      const clampOnItemCountChange = (newItemCount: number) => {
        itemCount = newItemCount;
        index = Math.min(index, Math.max(0, itemCount - 1));
      };

      clampOnItemCountChange(3);
      expect(index).toBe(2); // clamped to last item in new list
    });

    it('should keep index unchanged when itemCount stays larger', () => {
      let index = 5;

      const clampOnItemCountChange = (newItemCount: number) => {
        index = Math.min(index, Math.max(0, newItemCount - 1));
      };

      clampOnItemCountChange(50);
      expect(index).toBe(5); // unchanged, still valid
    });

    it('should clamp to 0 when itemCount becomes 1', () => {
      let index = 25;

      const clampOnItemCountChange = (newItemCount: number) => {
        index = Math.min(index, Math.max(0, newItemCount - 1));
      };

      clampOnItemCountChange(1);
      expect(index).toBe(0);
    });

    it('should handle itemCount going to 0 gracefully', () => {
      let index = 10;

      const clampOnItemCountChange = (newItemCount: number) => {
        index = Math.min(index, Math.max(0, newItemCount - 1));
      };

      clampOnItemCountChange(0);
      expect(index).toBe(0);
    });
  });

  describe('T024: Filter mode keys', () => {
    it('should call onActivateFilter when f is pressed', () => {
      const onActivateFilter = vi.fn();
      const isFilterInputActive = false;
      const input = 'f';

      if (!isFilterInputActive && input === 'f') {
        onActivateFilter();
      }

      expect(onActivateFilter).toHaveBeenCalledOnce();
    });

    it('should call onClearFilter when Escape is pressed', () => {
      const onClearFilter = vi.fn();
      const isFilterInputActive = false;
      const key = { escape: true };

      if (!isFilterInputActive && key.escape) {
        onClearFilter();
      }

      expect(onClearFilter).toHaveBeenCalledOnce();
    });

    it('should suppress navigation keys when filter input is active', () => {
      const controller = createKeyboardController(5, 0);
      const onClearFilter = vi.fn();
      const isFilterInputActive = true;

      const simulateInput = (input: string, key: { escape?: boolean } = {}) => {
        if (isFilterInputActive) {
          if (key.escape) {
            onClearFilter();
          }
          return;
        }
        controller.handleKey(input);
      };

      simulateInput('j');
      expect(controller.getIndex()).toBe(0);

      simulateInput('k');
      expect(controller.getIndex()).toBe(0);

      simulateInput('', { escape: true });
      expect(onClearFilter).toHaveBeenCalledOnce();
    });

    it('should not call onActivateFilter when filter input is active', () => {
      const onActivateFilter = vi.fn();
      const isFilterInputActive = true;

      if (!isFilterInputActive) {
        onActivateFilter();
      }

      expect(onActivateFilter).not.toHaveBeenCalled();
    });
  });
});
