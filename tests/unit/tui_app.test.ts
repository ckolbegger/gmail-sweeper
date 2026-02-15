import { describe, expect, it, vi } from 'vitest';

import { applyTuiCommand, createTuiAppState, renderTuiScreen } from '@/tui/app.js';

describe('ink app root state container', () => {
  it('should render inbox list with selected row highlight', () => {
    const state = createTuiAppState(2);
    const lines = renderTuiScreen(['First', 'Second'], state);

    expect(lines.join('\n')).toContain('> [1] First');
    expect(lines.join('\n')).toContain('  [2] Second');
  });

  it('should render detail pane for the selected message', async () => {
    let state = createTuiAppState(2);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View', 'Body msg-2']);

    state = await applyTuiCommand(
      state,
      'down',
      { messageIds: ['msg-1', 'msg-2'], fetchDetailLines }
    );
    state = await applyTuiCommand(
      state,
      'open',
      { messageIds: ['msg-1', 'msg-2'], fetchDetailLines }
    );

    const lines = renderTuiScreen(['First', 'Second'], state);
    expect(lines.join('\n')).toContain('Detail View');
    expect(lines.join('\n')).toContain('Body msg-2');
  });

  it('should transition between list and detail view modes', async () => {
    let state = createTuiAppState(3);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View', 'Body msg-2']);

    state = await applyTuiCommand(
      state,
      'down',
      { messageIds: ['msg-1', 'msg-2', 'msg-3'], fetchDetailLines }
    );
    state = await applyTuiCommand(
      state,
      'open',
      { messageIds: ['msg-1', 'msg-2', 'msg-3'], fetchDetailLines }
    );
    expect(state.navigation.viewMode).toBe('detail');

    state = await applyTuiCommand(
      state,
      'back',
      { messageIds: ['msg-1', 'msg-2', 'msg-3'], fetchDetailLines }
    );
    expect(state.navigation.viewMode).toBe('list');
    expect(state.navigation.selectedIndex).toBe(1);
  });

  it('should keep selected row visible when list selection moves past initial viewport', async () => {
    let state = createTuiAppState(25, 5);
    const messageIds = Array.from({ length: 25 }, (_, index) => `msg-${index + 1}`);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View']);

    for (let index = 0; index < 8; index += 1) {
      state = await applyTuiCommand(state, 'down', { messageIds, fetchDetailLines });
    }

    const lines = renderTuiScreen(
      messageIds.map((messageId, index) => `Line ${index + 1} ${messageId}`),
      state
    );

    expect(lines.join('\n')).toContain('> [9] Line 9 msg-9');
    expect(lines.join('\n')).toContain('  [7] Line 7 msg-7');
  });

  it('should render all rows when viewport is larger than the list', () => {
    const state = createTuiAppState(25, 40);
    const lines = renderTuiScreen(
      Array.from({ length: 25 }, (_, index) => `Line ${index + 1}`),
      state
    );

    const indexedRows = lines.filter((line) => line.startsWith('> [') || line.startsWith('  ['));
    expect(indexedRows).toHaveLength(25);
  });
});
