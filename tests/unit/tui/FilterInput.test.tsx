/**
 * T022: Unit tests for FilterInput component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { render as inkRender } from 'ink';
import React from 'react';
import { FilterInput } from '../../../src/tui/components/FilterInput.js';

/**
 * ink-testing-library v3 is incompatible with ink v4.4 (uses 'data' events
 * vs 'readable' stream). Use ink.render directly with a PassThrough stdin.
 */
function render(tree: React.ReactElement) {
  const stdin = new PassThrough() as PassThrough & {
    isTTY: boolean;
    setRawMode: () => void;
    ref: () => void;
    unref: () => void;
  };
  stdin.isTTY = true;
  stdin.setRawMode = () => {};
  stdin.ref = () => {};
  stdin.unref = () => {};

  const stdout = new PassThrough() as PassThrough & { columns: number };
  stdout.columns = 100;

  const stderr = new PassThrough();

  let lastFrame = '';
  stdout.on('data', (chunk: Buffer) => {
    lastFrame = chunk.toString();
  });

  const instance = inkRender(tree, {
    stdin: stdin as unknown as typeof process.stdin,
    stdout: stdout as unknown as typeof process.stdout,
    stderr: stderr as unknown as typeof process.stderr,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  return {
    stdin,
    lastFrame: () => lastFrame,
    rerender: instance.rerender,
    unmount: instance.unmount,
    cleanup: instance.cleanup,
  };
}

describe('FilterInput', () => {
  let defaultProps: {
    isLoading: boolean;
    error: string | null;
    onSubmit: ReturnType<typeof vi.fn>;
    onCancel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    defaultProps = {
      isLoading: false,
      error: null,
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    };
  });

  it('renders text input with "Filter: " label', () => {
    const { lastFrame, cleanup } = render(<FilterInput {...defaultProps} />);
    expect(lastFrame()).toContain('Filter:');
    cleanup();
  });

  it('calls onSubmit with value when Enter is pressed', async () => {
    const onSubmit = vi.fn();
    const { stdin, cleanup } = render(
      <FilterInput {...defaultProps} onSubmit={onSubmit} />,
    );

    stdin.write('newsletters');
    // Allow React to process
    await new Promise((r) => setTimeout(r, 50));
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 50));

    expect(onSubmit).toHaveBeenCalledWith('newsletters');
    cleanup();
  });

  it('displays loading indicator when isLoading is true', () => {
    const { lastFrame, cleanup } = render(
      <FilterInput {...defaultProps} isLoading={true} />,
    );
    expect(lastFrame()).toContain('Evaluating');
    cleanup();
  });

  it('displays progress next to spinner when progress is provided', () => {
    const { lastFrame, cleanup } = render(
      <FilterInput
        {...defaultProps}
        isLoading={true}
        progress={{ evaluatedCount: 7, totalCount: 70, percent: 10 }}
      />,
    );
    const frame = lastFrame();
    expect(frame).toContain('7/70');
    expect(frame).toContain('10%');
    cleanup();
  });

  it('shows "Evaluating..." when loading with no progress yet', () => {
    const { lastFrame, cleanup } = render(
      <FilterInput {...defaultProps} isLoading={true} />,
    );
    expect(lastFrame()).toContain('Evaluating');
    expect(lastFrame()).not.toContain('/');
    cleanup();
  });

  it('displays error message when error prop is set', () => {
    const { lastFrame, cleanup } = render(
      <FilterInput {...defaultProps} error="API request failed" />,
    );
    expect(lastFrame()).toContain('API request failed');
    cleanup();
  });

  it('calls onCancel when Escape key is pressed', async () => {
    const onCancel = vi.fn();
    const { stdin, cleanup } = render(
      <FilterInput {...defaultProps} onCancel={onCancel} />,
    );

    stdin.write('\x1B');
    await new Promise((r) => setTimeout(r, 50));

    expect(onCancel).toHaveBeenCalledOnce();
    cleanup();
  });
});
