/**
 * Unit tests for FilterInput component
 *
 * T022: Tests for filter input TUI component
 * Note: ink-text-input doesn't support stdin simulation in tests,
 * so we focus on testing render states and component behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { FilterInput } from '@/cli/components/filter-input.js';

describe('FilterInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe('rendering', () => {
    it('should render text input prompt', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(<FilterInput onSubmit={onSubmit} />);

      const output = lastFrame();
      expect(output).toContain('Filter:');
    });

    it('should show placeholder text when empty', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(<FilterInput onSubmit={onSubmit} />);

      const output = lastFrame();
      // Should show placeholder text
      expect(output).toMatch(/(description|filter|financial|enter)/i);
    });
  });

  describe('loading indicator (FR-004)', () => {
    it('should display loading indicator during evaluation', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(<FilterInput onSubmit={onSubmit} isLoading={true} />);

      const output = lastFrame();
      // Should show loading indicator
      expect(output).toMatch(/(Evaluating|spinner|loading)/i);
    });

    it('should not display loading indicator when not loading', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(<FilterInput onSubmit={onSubmit} isLoading={false} />);

      const output = lastFrame();
      // Should show input prompt instead of loading
      expect(output).toContain('Filter:');
      expect(output).not.toMatch(/Evaluating/i);
    });

    it('should disable input during loading', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(<FilterInput onSubmit={onSubmit} isLoading={true} />);

      // Should show loading state
      const output = lastFrame();
      expect(output).toMatch(/(Evaluating)/i);
    });
  });

  describe('error display', () => {
    it('should display error message on failure', () => {
      const onSubmit = vi.fn();
      const errorMessage = 'AI provider not configured';
      const { lastFrame } = render(
        <FilterInput onSubmit={onSubmit} error={errorMessage} />
      );

      const output = lastFrame();
      expect(output).toContain(errorMessage);
    });

    it('should show error in red color indicator', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(
        <FilterInput onSubmit={onSubmit} error="Test error" />
      );

      const output = lastFrame();
      // Error should be displayed with indicator
      expect(output).toContain('Test error');
      expect(output).toContain('✗');
    });

    it('should not display error when error is null', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(
        <FilterInput onSubmit={onSubmit} error={null} />
      );

      const output = lastFrame();
      // Should show normal input, not error
      expect(output).toContain('Filter:');
    });

    it('should clear error state when rerendered without error', () => {
      const onSubmit = vi.fn();
      const { lastFrame, rerender } = render(
        <FilterInput onSubmit={onSubmit} error="Previous error" />
      );

      // Initially shows error
      let output = lastFrame();
      expect(output).toContain('Previous error');

      // Simulate clearing error
      rerender(<FilterInput onSubmit={onSubmit} error={null} />);
      output = lastFrame();
      expect(output).not.toContain('Previous error');
    });
  });

  describe('component behavior', () => {
    it('should accept isLoading prop', () => {
      const onSubmit = vi.fn();
      // Should render without error
      const { lastFrame } = render(<FilterInput onSubmit={onSubmit} isLoading={true} />);
      expect(lastFrame()).toBeDefined();
    });

    it('should accept error prop', () => {
      const onSubmit = vi.fn();
      // Should render without error
      const { lastFrame } = render(<FilterInput onSubmit={onSubmit} error="Test" />);
      expect(lastFrame()).toBeDefined();
    });

    it('should show Escape hint when in error state', () => {
      const onSubmit = vi.fn();
      const { lastFrame } = render(
        <FilterInput onSubmit={onSubmit} error="Some error" />
      );

      const output = lastFrame();
      expect(output).toMatch(/Escape/i);
    });
  });
});
