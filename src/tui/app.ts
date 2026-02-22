import { Box, Text, useApp, useInput } from 'ink';
import { createElement, useCallback, useMemo, useState } from 'react';

import type { AiProvider } from '@/adapters/ai/provider.js';
import type { Email } from '@/core/entities.js';
import { mapError } from '@/core/errors.js';
import { runSmartFilter as runSmartFilterService } from '@/services/smart_filter_service.js';
import { buildFilterInputLines } from '@/tui/filter_input.js';
import type { TuiCommand, TuiKeyInfo } from '@/tui/input_controller.js';
import { mapInputToCommand } from '@/tui/input_controller.js';
import {
  closeDetailView,
  createNavigationState,
  moveSelection,
  openDetailView,
  type NavigationState
} from '@/tui/navigation_controls.js';

const DEFAULT_VIEWPORT_ROWS = 25;

export interface TuiCommandDeps {
  messageIds: string[];
  fetchDetailLines: (messageId: string) => Promise<string[]>;
  emails?: Email[];
  provider?: AiProvider | null;
  runSmartFilter?: typeof runSmartFilterService;
}

interface SmartFilterUiState {
  status: 'idle' | 'input' | 'loading' | 'filtered' | 'error';
  draft: string;
  description: string;
  errorMessage?: string;
  summaryLine: string;
  visibleIndexes: number[] | null;
}

export interface TuiAppState {
  navigation: NavigationState;
  viewportRows: number;
  detailLines: string[];
  statusLine: string;
  shouldExit: boolean;
  smartFilter: SmartFilterUiState;
}

export interface InkInboxAppProps extends TuiCommandDeps {
  listLines: string[];
  viewportRows?: number;
  onExit?: () => void;
}

function renderSelectableInboxLines(lines: string[], selectedIndex: number): string[] {
  return lines.map((line, index) => `${index === selectedIndex ? '>' : ' '} [${index + 1}] ${line}`);
}

function clampViewportRows(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_VIEWPORT_ROWS;
  }
  return Math.floor(value);
}

function padViewport(lines: string[], viewportRows: number): string[] {
  if (lines.length >= viewportRows) {
    return lines.slice(0, viewportRows);
  }

  return [...lines, ...Array.from({ length: viewportRows - lines.length }, () => '')];
}

function selectViewportWindow(
  lines: string[],
  selectedIndex: number,
  viewportRows: number
): string[] {
  if (lines.length <= viewportRows) {
    return lines;
  }

  const half = Math.floor(viewportRows / 2);
  const maxStart = lines.length - viewportRows;
  const start = Math.max(0, Math.min(selectedIndex - half, maxStart));
  return lines.slice(start, start + viewportRows);
}

function createSmartFilterUiState(): SmartFilterUiState {
  return {
    status: 'idle',
    draft: '',
    description: '',
    errorMessage: undefined,
    summaryLine: '',
    visibleIndexes: null
  };
}

function withNavigationListSize(navigation: NavigationState, listSize: number): NavigationState {
  const maxIndex = Math.max(0, listSize - 1);
  return {
    ...navigation,
    listSize,
    selectedIndex: Math.min(navigation.selectedIndex, maxIndex),
    listIndexBeforeDetail: Math.min(navigation.listIndexBeforeDetail, maxIndex)
  };
}

function getVisibleIndexes(state: TuiAppState, deps: TuiCommandDeps): number[] {
  if (state.smartFilter.visibleIndexes) {
    return state.smartFilter.visibleIndexes;
  }

  return deps.messageIds.map((_messageId, index) => index);
}

function getSelectedMessageId(state: TuiAppState, deps: TuiCommandDeps): string | undefined {
  const visibleIndexes = getVisibleIndexes(state, deps);
  const selectedSourceIndex = visibleIndexes[state.navigation.selectedIndex];
  if (selectedSourceIndex === undefined) {
    return undefined;
  }

  return deps.messageIds[selectedSourceIndex];
}

function applyInputDraft(state: TuiAppState, rawInput: string): TuiAppState {
  if (state.smartFilter.status !== 'input' || rawInput.length === 0) {
    return state;
  }

  return {
    ...state,
    smartFilter: {
      ...state.smartFilter,
      draft: `${state.smartFilter.draft}${rawInput}`
    }
  };
}

function removeLastDraftCharacter(state: TuiAppState): TuiAppState {
  if (state.smartFilter.status !== 'input' || state.smartFilter.draft.length === 0) {
    return state;
  }

  return {
    ...state,
    smartFilter: {
      ...state.smartFilter,
      draft: state.smartFilter.draft.slice(0, -1)
    }
  };
}

function isPlainTextInput(rawInput: string): boolean {
  if (rawInput.length === 0) {
    return false;
  }

  // Exclude control characters such as Enter (\r/\n), Backspace, Escape, etc.
  return !/[\p{C}]/u.test(rawInput);
}

function isEnterInput(rawInput: string): boolean {
  return rawInput === '\r' || rawInput === '\n' || rawInput === '\r\n';
}

function clearSmartFilter(state: TuiAppState, deps: TuiCommandDeps): TuiAppState {
  return {
    ...state,
    navigation: withNavigationListSize(state.navigation, deps.messageIds.length),
    statusLine: 'Smart filter cleared.',
    smartFilter: createSmartFilterUiState()
  };
}

async function submitSmartFilter(state: TuiAppState, deps: TuiCommandDeps): Promise<TuiAppState> {
  const description = state.smartFilter.draft.trim();
  if (description.length === 0) {
    return {
      ...state,
      smartFilter: {
        ...state.smartFilter,
        status: 'error',
        errorMessage: 'Filter description cannot be empty'
      },
      statusLine: '(error) Filter description cannot be empty'
    };
  }

  if (!deps.provider || !deps.emails) {
    const errorMessage = 'Smart filter requires AI_PROVIDER, AI_MODEL, and AI_API_KEY.';
    return {
      ...state,
      smartFilter: {
        ...state.smartFilter,
        status: 'error',
        description,
        errorMessage
      },
      statusLine: `(error) ${errorMessage}`
    };
  }

  const runSmartFilter = deps.runSmartFilter ?? runSmartFilterService;
  const loadingState: TuiAppState = {
    ...state,
    smartFilter: {
      ...state.smartFilter,
      status: 'loading',
      description,
      errorMessage: undefined
    },
    statusLine: 'Evaluating smart filter...'
  };

  try {
    const result = await runSmartFilter({
      description,
      emails: deps.emails,
      provider: deps.provider
    });
    const indexById = new Map<string, number>(
      deps.messageIds.map((messageId, index) => [messageId, index])
    );
    const visibleIndexes = result.matchingResults
      .map((entry) => indexById.get(entry.emailId))
      .filter((index): index is number => index !== undefined);
    const summaryLine = `Filtered: ${visibleIndexes.length}/${deps.messageIds.length} emails`;

    return {
      ...loadingState,
      navigation: withNavigationListSize(state.navigation, visibleIndexes.length),
      statusLine: summaryLine,
      smartFilter: {
        ...loadingState.smartFilter,
        status: 'filtered',
        draft: '',
        description,
        summaryLine,
        visibleIndexes
      }
    };
  } catch (error) {
    const mapped = mapError(error);
    return {
      ...loadingState,
      navigation: withNavigationListSize(state.navigation, deps.messageIds.length),
      statusLine: `(error) ${mapped.message}`,
      smartFilter: {
        ...loadingState.smartFilter,
        status: 'error',
        errorMessage: mapped.message,
        visibleIndexes: null
      }
    };
  }
}

export function createTuiAppState(listSize: number, viewportRows = DEFAULT_VIEWPORT_ROWS): TuiAppState {
  return {
    navigation: createNavigationState(listSize),
    viewportRows: clampViewportRows(viewportRows),
    detailLines: [],
    statusLine: '',
    shouldExit: false,
    smartFilter: createSmartFilterUiState()
  };
}

export async function applyTuiCommand(
  state: TuiAppState,
  command: TuiCommand,
  deps: TuiCommandDeps,
  rawInput = ''
): Promise<TuiAppState> {
  if (command === 'noop' && isPlainTextInput(rawInput)) {
    return applyInputDraft(state, rawInput);
  }

  if (state.navigation.viewMode === 'list' && state.smartFilter.status === 'input') {
    if (isPlainTextInput(rawInput)) {
      return applyInputDraft(state, rawInput);
    }

    if (isEnterInput(rawInput)) {
      return submitSmartFilter(state, deps);
    }

    if (command === 'open') {
      return submitSmartFilter(state, deps);
    }

    if (command === 'escape') {
      return clearSmartFilter(state, deps);
    }

    if (command === 'back') {
      return removeLastDraftCharacter(state);
    }

    if (command !== 'quit') {
      return state;
    }
  }

  if (command === 'quit') {
    return {
      ...state,
      shouldExit: true,
      statusLine: 'Exited interactive mode.'
    };
  }

  if (state.navigation.viewMode === 'list') {
    if (command === 'filter') {
      return {
        ...state,
        smartFilter: {
          ...state.smartFilter,
          status: 'input',
          draft: '',
          errorMessage: undefined
        },
        statusLine: 'Enter smart filter description and press Enter.'
      };
    }

    if (command === 'escape') {
      if (
        state.smartFilter.status === 'idle' &&
        state.smartFilter.summaryLine.length === 0 &&
        state.smartFilter.description.length === 0
      ) {
        return state;
      }

      return clearSmartFilter(state, deps);
    }

    if (command === 'up' || command === 'down') {
      return {
        ...state,
        navigation: moveSelection(state.navigation, command),
        statusLine: ''
      };
    }

    if (command === 'open') {
      if (state.smartFilter.status === 'input') {
        return submitSmartFilter(state, deps);
      }

      const messageId = getSelectedMessageId(state, deps);
      if (!messageId) {
        return {
          ...state,
          statusLine: '(error) No message selected'
        };
      }

      try {
        const detailLines = await deps.fetchDetailLines(messageId);
        return {
          ...state,
          navigation: openDetailView(state.navigation, messageId),
          detailLines,
          statusLine: ''
        };
      } catch (error) {
        const mapped = mapError(error);
        return {
          ...state,
          statusLine: `(error) ${mapped.message}`
        };
      }
    }

    return state;
  }

  if (command === 'back' || command === 'escape') {
    return {
      ...state,
      navigation: closeDetailView(state.navigation),
      detailLines: [],
      statusLine: 'Returned to inbox list'
    };
  }

  // Ignore list movement while detail is open.
  return state;
}

export function renderTuiScreen(listLines: string[], state: TuiAppState): string[] {
  const modeLine = `Mode: ${state.navigation.viewMode}`;
  const viewportRows = state.viewportRows;
  const activeListLines =
    state.smartFilter.visibleIndexes === null
      ? listLines
      : state.smartFilter.visibleIndexes.map((index) => listLines[index] ?? '(unknown message)');
  const body =
    state.navigation.viewMode === 'list'
      ? selectViewportWindow(
          renderSelectableInboxLines(activeListLines, state.navigation.selectedIndex),
          state.navigation.selectedIndex,
          viewportRows
        )
      : state.detailLines;
  const viewport = padViewport(body.length > 0 ? body : ['(no messages)'], viewportRows);
  const status = state.statusLine.length > 0 ? state.statusLine : '';
  const filterLines =
    state.navigation.viewMode === 'list'
      ? buildFilterInputLines({
          status: state.smartFilter.status,
          draft: state.smartFilter.draft,
          description: state.smartFilter.description,
          errorMessage: state.smartFilter.errorMessage
        })
      : [];
  const selectedLine =
    state.navigation.viewMode === 'list' ? `Selected #${state.navigation.selectedIndex + 1}` : '';
  const helpLine =
    state.navigation.viewMode === 'list'
      ? 'Keys: j/k or arrows move, enter opens/applies, f filters, Esc clears filter, q quits'
      : 'Keys: b or Esc returns to list, q quits';

  return [modeLine, status, ...filterLines, ...viewport, selectedLine, helpLine];
}

export function InkInboxApp(props: InkInboxAppProps): unknown {
  const { exit } = useApp();
  const [state, setState] = useState<TuiAppState>(() =>
    createTuiAppState(props.messageIds.length, props.viewportRows)
  );
  const commandDeps = useMemo<TuiCommandDeps>(
    () => ({
      messageIds: props.messageIds,
      fetchDetailLines: props.fetchDetailLines,
      emails: props.emails,
      provider: props.provider,
      runSmartFilter: props.runSmartFilter
    }),
    [props.emails, props.fetchDetailLines, props.messageIds, props.provider, props.runSmartFilter]
  );

  const dispatchCommand = useCallback(
    (command: TuiCommand, rawInput = '') => {
      void applyTuiCommand(state, command, commandDeps, rawInput).then((nextState) => {
        setState(nextState);
        if (nextState.shouldExit) {
          props.onExit?.();
          exit();
        }
      });
    },
    [commandDeps, exit, props, state]
  );

  useInput((input, key) => {
    const normalizedKey: TuiKeyInfo = {
      upArrow: key.upArrow,
      downArrow: key.downArrow,
      return: key.return,
      backspace: key.backspace,
      escape: key.escape,
      ctrl: key.ctrl
    };
    dispatchCommand(mapInputToCommand(input, normalizedKey), input);
  });

  const screenLines = renderTuiScreen(props.listLines, state);
  return createElement(
    Box,
    { flexDirection: 'column' },
    ...screenLines.map((line, index) => createElement(Text, { key: `${index}:${line}` }, line))
  );
}
