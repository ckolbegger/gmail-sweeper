import { describe, it, expect, vi } from 'vitest';
import { getTerminalWidth } from '../../../src/core/rendering/terminal-width.js';

describe('getTerminalWidth', () => {
  it('should return default width when process.stdout.columns is available', () => {
    vi.stubGlobal('process', {
      ...process,
      stdout: { columns: 120 },
    });

    expect(getTerminalWidth()).toBe(120);
  });

  it('should return default width of 80 when columns is undefined', () => {
    vi.stubGlobal('process', {
      ...process,
      stdout: { columns: undefined },
    });

    expect(getTerminalWidth()).toBe(80);
  });

  it('should return default width of 80 when stdout is undefined', () => {
    vi.stubGlobal('process', {
      ...process,
      stdout: undefined,
    });

    expect(getTerminalWidth()).toBe(80);
  });
});
