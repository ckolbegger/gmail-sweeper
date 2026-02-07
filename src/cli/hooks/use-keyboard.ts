/**
 * Keyboard Navigation Hook
 *
 * Registers keyboard event listeners for TUI navigation.
 */

import { useEffect } from 'react';
import { useInput } from 'ink';

export type KeyHandler = (input: string, key: KeyHandlerKey) => void | boolean;

export interface KeyHandlerKey {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  tab: boolean;
  delete: boolean;
  backspace: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void | boolean;
  description: string;
}

export interface UseKeyboardOptions {
  shortcuts?: KeyboardShortcut[];
  onUnhandled?: (input: string, key: KeyHandlerKey) => void;
}

/**
 * Hook for registering keyboard event listeners
 */
export function useKeyboard(options: UseKeyboardOptions = {}) {
  const { shortcuts, onUnhandled } = options;

  useInput((input, key) => {
    let handled = false;

    // Check registered shortcuts
    for (const shortcut of shortcuts || []) {
      const keyMatch = input.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === key.ctrl;
      const shiftMatch = !!shortcut.shift === key.shift;

      if (keyMatch && ctrlMatch && shiftMatch) {
        const result = shortcut.handler();
        if (result !== false) {
          handled = true;
          break;
        }
      }
    }

    // Call unhandled handler if no shortcut matched
    if (!handled && onUnhandled) {
      onUnhandled(input, key);
    }
  });
}

/**
 * Hook for registering a single key handler
 */
export function useKeyHandler(
  key: string,
  handler: () => void | boolean,
  options: { ctrl?: boolean; shift?: boolean } = {}
) {
  useKeyboard({
    shortcuts: [{ key, handler, ...options, description: '' }],
  });
}

/**
 * Hook for cleanup on unmount
 */
export function useCleanup(callback: () => void) {
  useEffect(() => {
    return () => {
      callback();
    };
  }, [callback]);
}

/**
 * Default keyboard shortcuts for the app
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'q', handler: () => process.exit(0), description: 'Quit' },
  { key: 'upArrow', handler: () => {}, description: 'Navigate up' },
  { key: 'downArrow', handler: () => {}, description: 'Navigate down' },
  { key: 'return', handler: () => {}, description: 'Select' },
  { key: 'escape', handler: () => {}, description: 'Go back' },
];
