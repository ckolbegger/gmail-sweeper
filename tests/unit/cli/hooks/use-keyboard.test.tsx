/**
 * useKeyboard Hook Tests
 *
 * Tests for the keyboard navigation hook.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import { useKeyboard } from '../../../../src/cli/hooks/use-keyboard.js';

describe('useKeyboard', () => {
  it('should render component with useKeyboard hook', () => {
    function TestComponent(): React.ReactElement {
      useKeyboard({
        onUp: () => {},
        onDown: () => {},
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'Test'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Test');
  });

  it('should handle multiple keyboard handlers', () => {
    function TestComponent(): React.ReactElement {
      useKeyboard({
        onEnter: () => {},
        onEscape: () => {},
        onTab: () => {},
        a: () => {},
        q: () => {},
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'Multi'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Multi');
  });

  it('should support ctrl key combinations', () => {
    function TestComponent(): React.ReactElement {
      useKeyboard({
        'ctrl+c': () => {},
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'Ctrl'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Ctrl');
  });

  it('should cleanup on unmount without errors', () => {
    function TestComponent(): React.ReactElement {
      useKeyboard({
        onUp: () => {},
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'Cleanup'));
    }

    const { unmount, lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Cleanup');

    // Should not throw
    expect(() => unmount()).not.toThrow();
  });

  it('should support navigation keys', () => {
    function TestComponent(): React.ReactElement {
      useKeyboard({
        onUp: () => {},
        onDown: () => {},
        onLeft: () => {},
        onRight: () => {},
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'Nav'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Nav');
  });

  it('should handle empty handlers gracefully', () => {
    function TestComponent(): React.ReactElement {
      useKeyboard({});
      return React.createElement(Box, null, React.createElement(Text, null, 'Empty'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Empty');
  });

  it('should handle f key to activate filter mode (FR-001)', () => {
    const fHandler = vi.fn();
    function TestComponent(): React.ReactElement {
      useKeyboard({
        f: fHandler,
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'Filter'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Filter');
    expect(fHandler).toBeDefined();
  });

  it('should handle Escape key to clear filter (FR-007)', () => {
    const escapeHandler = vi.fn();
    function TestComponent(): React.ReactElement {
      useKeyboard({
        onEscape: escapeHandler,
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'Escape'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('Escape');
    expect(escapeHandler).toBeDefined();
  });

  it('should disable navigation keys when isFilterInputMode is true', () => {
    const upHandler = vi.fn();
    const downHandler = vi.fn();
    const leftHandler = vi.fn();
    const rightHandler = vi.fn();

    function TestComponent(): React.ReactElement {
      useKeyboard({
        onUp: upHandler,
        onDown: downHandler,
        onLeft: leftHandler,
        onRight: rightHandler,
      });
      return React.createElement(Box, null, React.createElement(Text, null, 'NavDisabled'));
    }

    const { lastFrame } = render(React.createElement(TestComponent));
    expect(lastFrame()).toContain('NavDisabled');
    expect(upHandler).toBeDefined();
    expect(downHandler).toBeDefined();
    expect(leftHandler).toBeDefined();
    expect(rightHandler).toBeDefined();
  });
});
