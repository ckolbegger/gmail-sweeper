import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { FilterInput } from '@/cli/components/filter-input.js';

describe('FilterInput', () => {
  it('should render a text input field', () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      React.createElement(FilterInput, {
        onSubmit,
        isLoading: false,
        error: undefined,
      })
    );

    const output = lastFrame();
    expect(output).toBeDefined();
    expect(typeof output).toBe('string');
    expect(output).toContain('Filter:');
  });

  it('should display loading indicator when isLoading is true', () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      React.createElement(FilterInput, {
        onSubmit,
        isLoading: true,
        error: undefined,
      })
    );

    const output = lastFrame();
    expect(output).toContain('Evaluating');
  });

  it('should display error message when error is provided', () => {
    const onSubmit = vi.fn();
    const errorMessage = 'API connection failed';
    const { lastFrame } = render(
      React.createElement(FilterInput, {
        onSubmit,
        isLoading: false,
        error: new Error(errorMessage),
      })
    );

    const output = lastFrame();
    expect(output).toContain(errorMessage);
  });

  it('should render without loading indicator when isLoading is false', () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      React.createElement(FilterInput, {
        onSubmit,
        isLoading: false,
        error: undefined,
      })
    );

    const output = lastFrame();
    expect(output).not.toContain('Evaluating');
  });

  it('should render without error message when error is undefined', () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      React.createElement(FilterInput, {
        onSubmit,
        isLoading: false,
        error: undefined,
      })
    );

    const output = lastFrame();
    expect(output).not.toContain('Error');
  });

  it('should render placeholder text', () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      React.createElement(FilterInput, {
        onSubmit,
        isLoading: false,
        error: undefined,
      })
    );

    const output = lastFrame();
    expect(output).toContain('Enter filter description');
  });

  it('should render with disabled state when loading', () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      React.createElement(FilterInput, {
        onSubmit,
        isLoading: true,
        error: undefined,
      })
    );

    const output = lastFrame();
    expect(output).toBeDefined();
    expect(typeof output).toBe('string');
  });
});
