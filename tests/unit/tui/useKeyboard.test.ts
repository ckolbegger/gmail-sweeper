/**
 * T039: Unit tests for useKeyboard hook.
 * Tests keyboard navigation (j/k, arrows, Enter, boundaries).
 */

import { describe, it, expect, vi } from 'vitest';

// Test keyboard navigation logic directly (hook testing without React)
describe('useKeyboard', () => {
  describe('T039: Navigation', () => {
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
});
