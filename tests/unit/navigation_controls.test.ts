import { describe, expect, it } from 'vitest';

import {
  closeDetailView,
  createNavigationState,
  moveSelection,
  openDetailView
} from '@/tui/navigation_controls.js';

describe('navigation controls', () => {
  it('should move list selection up and down within bounds', () => {
    let state = createNavigationState(3);
    state = moveSelection(state, 'down');
    expect(state.selectedIndex).toBe(1);

    state = moveSelection(state, 'down');
    state = moveSelection(state, 'down');
    expect(state.selectedIndex).toBe(2);

    state = moveSelection(state, 'up');
    state = moveSelection(state, 'up');
    state = moveSelection(state, 'up');
    expect(state.selectedIndex).toBe(0);
  });

  it('should track current view mode as list or detail', () => {
    let state = createNavigationState(2);
    expect(state.viewMode).toBe('list');

    state = openDetailView(state, 'msg-1');
    expect(state.viewMode).toBe('detail');
    expect(state.detailMessageId).toBe('msg-1');
  });

  it('should restore prior selection when leaving detail view', () => {
    let state = createNavigationState(3);
    state = moveSelection(state, 'down');
    state = moveSelection(state, 'down');
    state = openDetailView(state, 'msg-3');
    state = closeDetailView(state);

    expect(state.viewMode).toBe('list');
    expect(state.selectedIndex).toBe(2);
    expect(state.detailMessageId).toBeUndefined();
  });
});
