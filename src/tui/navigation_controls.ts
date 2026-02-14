export type ViewMode = 'list' | 'detail';
export type NavigationDirection = 'up' | 'down';

export interface NavigationState {
  listSize: number;
  selectedIndex: number;
  viewMode: ViewMode;
  detailMessageId?: string;
  listIndexBeforeDetail: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createNavigationState(listSize: number): NavigationState {
  return {
    listSize,
    selectedIndex: 0,
    viewMode: 'list',
    listIndexBeforeDetail: 0
  };
}

export function moveSelection(
  state: NavigationState,
  direction: NavigationDirection
): NavigationState {
  if (state.viewMode !== 'list' || state.listSize <= 0) {
    return state;
  }

  const offset = direction === 'down' ? 1 : -1;
  const maxIndex = Math.max(0, state.listSize - 1);
  const selectedIndex = clamp(state.selectedIndex + offset, 0, maxIndex);

  return {
    ...state,
    selectedIndex
  };
}

export function openDetailView(state: NavigationState, messageId: string): NavigationState {
  return {
    ...state,
    viewMode: 'detail',
    detailMessageId: messageId,
    listIndexBeforeDetail: state.selectedIndex
  };
}

export function closeDetailView(state: NavigationState): NavigationState {
  return {
    ...state,
    viewMode: 'list',
    selectedIndex: clamp(state.listIndexBeforeDetail, 0, Math.max(0, state.listSize - 1)),
    detailMessageId: undefined
  };
}
