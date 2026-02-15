import { describe, expect, it } from 'vitest';

import { runInkSession } from '@/tui/ink_runtime.js';

describe('ink in-place navigation integration', () => {
  it('should keep a fixed viewport while moving selection', async () => {
    const frames: string[][] = [];

    await runInkSession({
      listLines: ['First', 'Second', 'Third'],
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
      fetchDetailLines: async () => ['Detail View', 'Body'],
      scriptedCommands: ['down', 'down', 'quit'],
      onFrame: (frame) => frames.push(frame)
    });

    const listFrames = frames.filter((frame) => frame.includes('Mode: list'));
    const heights = new Set(listFrames.map((frame) => frame.length));
    expect(heights.size).toBe(1);
  });

  it('should update rendered state instead of appending duplicate list output', async () => {
    const frames: string[][] = [];

    await runInkSession({
      listLines: ['First', 'Second'],
      messageIds: ['msg-1', 'msg-2'],
      fetchDetailLines: async () => ['Detail View', 'Body'],
      scriptedCommands: ['down', 'up', 'quit'],
      onFrame: (frame) => frames.push(frame)
    });

    const lastListFrame = frames.filter((frame) => frame.includes('Mode: list')).at(-1) ?? [];
    const indexedRows = lastListFrame.filter((line) => line.startsWith('> [') || line.startsWith('  ['));
    expect(indexedRows).toHaveLength(2);
  });

  it('should preserve selected row while switching between list and detail panes', async () => {
    const frames: string[][] = [];

    await runInkSession({
      listLines: ['First', 'Second'],
      messageIds: ['msg-1', 'msg-2'],
      fetchDetailLines: async () => ['Detail View', 'Body msg-2'],
      scriptedCommands: ['down', 'open', 'back', 'quit'],
      onFrame: (frame) => frames.push(frame)
    });

    const detailFrame = frames.find((frame) => frame.includes('Mode: detail')) ?? [];
    expect(detailFrame.join('\n')).toContain('Body msg-2');

    const lastListFrame = frames.filter((frame) => frame.includes('Mode: list')).at(-1) ?? [];
    expect(lastListFrame.join('\n')).toContain('> [2] Second');
  });
});
