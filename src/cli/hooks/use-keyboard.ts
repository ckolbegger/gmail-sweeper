/**
 * useKeyboard Hook
 *
 * Handles keyboard navigation and input for the CLI.
 */

// Hook uses useInput from ink, no additional React hooks needed
import { useInput, Key } from 'ink';

export interface KeyboardHandlers {
  /** Arrow up */
  onUp?: () => void;
  /** Arrow down */
  onDown?: () => void;
  /** Arrow left */
  onLeft?: () => void;
  /** Arrow right */
  onRight?: () => void;
  /** Enter/Return */
  onEnter?: () => void;
  /** Escape */
  onEscape?: () => void;
  /** Tab */
  onTab?: () => void;
  /** Space */
  onSpace?: () => void;
  /** Letter keys */
  a?: () => void;
  d?: () => void;
  e?: () => void;
  f?: () => void;
  l?: () => void;
  q?: () => void;
  r?: () => void;
  s?: () => void;
  /** Ctrl+C */
  'ctrl+c'?: () => void;
  /** Ctrl+D */
  'ctrl+d'?: () => void;
}

export interface UseKeyboardOptions {
  /** Disable navigation keys (up/down/left/right) during filter input mode */
  disableNavigation?: boolean;
}

/**
 * Hook for handling keyboard input
 */
export function useKeyboard(handlers: KeyboardHandlers, options?: UseKeyboardOptions): void {
  useInput((input, key: Key) => {
    const navigationDisabled = options?.disableNavigation ?? false;

    if (!navigationDisabled) {
      if (key.upArrow && handlers.onUp) {
        handlers.onUp();
        return;
      }

      if (key.downArrow && handlers.onDown) {
        handlers.onDown();
        return;
      }

      if (key.leftArrow && handlers.onLeft) {
        handlers.onLeft();
        return;
      }

      if (key.rightArrow && handlers.onRight) {
        handlers.onRight();
        return;
      }
    }

    // Handle special keys
    if (key.return && handlers.onEnter) {
      handlers.onEnter();
      return;
    }

    if (key.escape && handlers.onEscape) {
      handlers.onEscape();
      return;
    }

    if (key.tab && handlers.onTab) {
      handlers.onTab();
      return;
    }

    // Handle space
    if (input === ' ' && handlers.onSpace) {
      handlers.onSpace();
      return;
    }

    // Handle letter keys
    if (input === 'a' && handlers.a) {
      handlers.a();
      return;
    }

    if (input === 'd' && handlers.d) {
      handlers.d();
      return;
    }

    if (input === 'e' && handlers.e) {
      handlers.e();
      return;
    }

    if (input === 'f' && handlers.f) {
      handlers.f();
      return;
    }

    if (input === 'l' && handlers.l) {
      handlers.l();
      return;
    }

    if (input === 'q' && handlers.q) {
      handlers.q();
      return;
    }

    if (input === 'r' && handlers.r) {
      handlers.r();
      return;
    }

    if (input === 's' && handlers.s) {
      handlers.s();
      return;
    }

    // Handle Ctrl+C
    if (key.ctrl && input === 'c' && handlers['ctrl+c']) {
      handlers['ctrl+c']();
      return;
    }

    // Handle Ctrl+D
    if (key.ctrl && input === 'd' && handlers['ctrl+d']) {
      handlers['ctrl+d']();
      return;
    }
  });
}
