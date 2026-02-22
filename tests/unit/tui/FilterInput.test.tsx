/**
 * T022: Unit tests for FilterInput component.
 * Tests text input rendering, submission, loading state, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { FilterInput } from '../../../src/tui/components/FilterInput.js';

describe('FilterInput', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T022: Display', () => {
    it('should render text input when state is input', () => {
      const { lastFrame } = render(
        <FilterInput state="input" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).toBeTruthy();
      expect(output).toMatch(/filter|filter emails/i);
    });

    it('should render bordered panel with title', () => {
      const { lastFrame } = render(
        <FilterInput state="input" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).toContain('Filter Emails:');
    });

    it('should display empty placeholder when no value', () => {
      const { lastFrame } = render(
        <FilterInput state="input" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).toMatch(/enter description/i);
    });

    it('should not render when state is idle', () => {
      const { lastFrame } = render(
        <FilterInput state="idle" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).toBe('');
    });

    it('should not render when state is filtered', () => {
      const { lastFrame } = render(
        <FilterInput state="filtered" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).toBe('');
    });
  });

  describe('T022: Loading state (FR-004)', () => {
    it('should display loading indicator during evaluation', () => {
      const { lastFrame } = render(
        <FilterInput state="loading" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).toMatch(/evaluating/i);
    });
  });

  describe('T022: Error handling', () => {
    it('should display error message when provided', () => {
      const errorMessage = 'AI configuration not found';
      const { lastFrame } = render(
        <FilterInput
          state="error"
          errorMessage={errorMessage}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const output = lastFrame();
      expect(output).toContain(errorMessage);
    });

    it('should display error message when provided regardless of state', () => {
      const errorMessage = 'AI configuration not found';
      const { lastFrame } = render(
        <FilterInput
          state="input"
          errorMessage={errorMessage}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const output = lastFrame();
      expect(output).toContain(errorMessage);
    });
  });

  describe('T022: User hints', () => {
    it('should show hint text when in input state', () => {
      const { lastFrame } = render(
        <FilterInput state="input" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).toMatch(/enter to filter|escape to cancel/i);
    });

    it('should not show hint when in loading state', () => {
      const { lastFrame } = render(
        <FilterInput state="loading" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      const output = lastFrame();
      expect(output).not.toMatch(/enter to filter|escape to cancel/i);
    });
  });
});
