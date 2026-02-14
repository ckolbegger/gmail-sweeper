import { Box, Text, useApp, useInput } from 'ink';
import { createElement, useCallback, useMemo, useState } from 'react';

import { mapError } from '@/core/errors.js';
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
}

export interface TuiAppState {
  navigation: NavigationState;
  viewportRows: number;
  detailLines: string[];
  statusLine: string;
  shouldExit: boolean;
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

export function createTuiAppState(listSize: number, viewportRows = DEFAULT_VIEWPORT_ROWS): TuiAppState {
  return {
    navigation: createNavigationState(listSize),
    viewportRows: clampViewportRows(viewportRows),
    detailLines: [],
    statusLine: '',
    shouldExit: false
  };
}

export async function applyTuiCommand(
  state: TuiAppState,
  command: TuiCommand,
  deps: TuiCommandDeps
): Promise<TuiAppState> {
  if (command === 'noop') {
    return state;
  }

  if (command === 'quit') {
    return {
      ...state,
      shouldExit: true,
      statusLine: 'Exited interactive mode.'
    };
  }

  if (state.navigation.viewMode === 'list') {
    if (command === 'up' || command === 'down') {
      return {
        ...state,
        navigation: moveSelection(state.navigation, command),
        statusLine: ''
      };
    }

    if (command === 'open') {
      const messageId = deps.messageIds[state.navigation.selectedIndex];
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

  if (command === 'back') {
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
  const body =
    state.navigation.viewMode === 'list'
      ? selectViewportWindow(
          renderSelectableInboxLines(listLines, state.navigation.selectedIndex),
          state.navigation.selectedIndex,
          viewportRows
        )
      : state.detailLines;
  const viewport = padViewport(body.length > 0 ? body : ['(no messages)'], viewportRows);
  const status = state.statusLine.length > 0 ? state.statusLine : '';
  const selectedLine =
    state.navigation.viewMode === 'list' ? `Selected #${state.navigation.selectedIndex + 1}` : '';
  const helpLine =
    state.navigation.viewMode === 'list'
      ? 'Keys: j/k or arrows move, enter opens, q quits'
      : 'Keys: b returns to list, q quits';

  return [modeLine, status, ...viewport, selectedLine, helpLine];
}

export function InkInboxApp(props: InkInboxAppProps): unknown {
  const { exit } = useApp();
  const [state, setState] = useState<TuiAppState>(() =>
    createTuiAppState(props.messageIds.length, props.viewportRows)
  );
  const commandDeps = useMemo<TuiCommandDeps>(
    () => ({
      messageIds: props.messageIds,
      fetchDetailLines: props.fetchDetailLines
    }),
    [props.fetchDetailLines, props.messageIds]
  );

  const dispatchCommand = useCallback(
    (command: TuiCommand) => {
      void applyTuiCommand(state, command, commandDeps).then((nextState) => {
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
    dispatchCommand(mapInputToCommand(input, normalizedKey));
  });

  const screenLines = renderTuiScreen(props.listLines, state);
  return createElement(
    Box,
    { flexDirection: 'column' },
    ...screenLines.map((line, index) => createElement(Text, { key: `${index}:${line}` }, line))
  );
}
