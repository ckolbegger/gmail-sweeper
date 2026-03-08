import { Box, Text, useApp, useInput } from 'ink';
import { createElement, useCallback, useMemo, useState } from 'react';

import type { AiProvider } from '@/adapters/ai/provider.js';
import type { Email } from '@/core/entities.js';
import { mapError } from '@/core/errors.js';
import {
  renderSummaryDetailLines,
  type EmailSummaryService
} from '@/services/email_summary_service.js';
import { runSmartFilter as runSmartFilterService } from '@/services/smart_filter_service.js';
import { buildFilterInputLines } from '@/tui/filter_input.js';
import { formatConfidenceIndicator } from '@/tui/inbox_list.js';
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
  fetchDetailData?: (messageId: string) => Promise<{
    subject: string;
    sender: string;
    body: string;
  }>;
  archiveEmail?: (messageId: string) => Promise<void>;
  deleteEmail?: (messageId: string) => Promise<void>;
  emails?: Email[];
  provider?: AiProvider | null;
  summaryService?: EmailSummaryService;
  runSmartFilter?: typeof runSmartFilterService;
  onStateUpdate?: (state: TuiAppState) => void;
}

interface SmartFilterUiState {
  status: 'idle' | 'input' | 'loading' | 'filtered' | 'error';
  draft: string;
  description: string;
  errorMessage?: string;
  summaryLine: string;
  visibleIndexes: number[] | null;
  confidenceBySourceIndex: Record<number, number>;
  requestId: number;
}

interface DetailSummaryUiState {
  mode: 'full' | 'loading_summary' | 'summary';
  messageId?: string;
  fullLines: string[];
  rawDetail?: {
    subject: string;
    sender: string;
    body: string;
  };
  summaryLines: string[];
  requestId: number;
  errorMessage?: string;
}

export interface TuiAppState {
  navigation: NavigationState;
  viewportRows: number;
  detailLines: string[];
  statusLine: string;
  shouldExit: boolean;
  hiddenSourceIndexes: Record<number, true>;
  smartFilter: SmartFilterUiState;
  detailSummary: DetailSummaryUiState;
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
    visibleIndexes: null,
    confidenceBySourceIndex: {},
    requestId: 0
  };
}

function createDetailSummaryUiState(): DetailSummaryUiState {
  return {
    mode: 'full',
    messageId: undefined,
    fullLines: [],
    rawDetail: undefined,
    summaryLines: [],
    requestId: 0,
    errorMessage: undefined
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

function getAllSourceIndexes(messageIds: string[]): number[] {
  return messageIds.map((_messageId, index) => index);
}

function excludeHiddenIndexes(indexes: number[], hiddenSourceIndexes: Record<number, true>): number[] {
  return indexes.filter((index) => hiddenSourceIndexes[index] !== true);
}

function getVisibleIndexes(state: TuiAppState, deps: TuiCommandDeps): number[] {
  const baseIndexes = state.smartFilter.visibleIndexes ?? getAllSourceIndexes(deps.messageIds);
  return excludeHiddenIndexes(baseIndexes, state.hiddenSourceIndexes);
}

function getSelectedSourceIndex(state: TuiAppState, deps: TuiCommandDeps): number | undefined {
  const visibleIndexes = getVisibleIndexes(state, deps);
  return visibleIndexes[state.navigation.selectedIndex];
}

function getSelectedMessageId(state: TuiAppState, deps: TuiCommandDeps): string | undefined {
  const selectedSourceIndex = getSelectedSourceIndex(state, deps);
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
  const visibleIndexes = excludeHiddenIndexes(getAllSourceIndexes(deps.messageIds), state.hiddenSourceIndexes);
  return {
    ...state,
    navigation: withNavigationListSize(state.navigation, visibleIndexes.length),
    statusLine: 'Smart filter cleared.',
    smartFilter: {
      ...createSmartFilterUiState(),
      requestId: state.smartFilter.requestId + 1
    }
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
  const requestId = state.smartFilter.requestId + 1;
  const loadingState: TuiAppState = {
    ...state,
    smartFilter: {
      ...state.smartFilter,
      status: 'loading',
      description,
      errorMessage: undefined,
      summaryLine: '',
      requestId
    },
    statusLine: 'Evaluating smart filter...'
  };
  deps.onStateUpdate?.(loadingState);

  try {
    const result = await runSmartFilter({
      description,
      emails: deps.emails,
      provider: deps.provider,
      onProgress: (progress) => {
        deps.onStateUpdate?.({
          ...loadingState,
          statusLine: `Evaluating batch ${progress.currentBatch}/${progress.totalBatches}...`,
          smartFilter: {
            ...loadingState.smartFilter,
            summaryLine: `Evaluating batch ${progress.currentBatch}/${progress.totalBatches}...`
          }
        });
      }
    });
    const indexById = new Map<string, number>(
      deps.messageIds.map((messageId, index) => [messageId, index])
    );
    const sortedMatches = [...result.matchingResults].sort((left, right) => right.confidence - left.confidence);
    const visibleIndexes = sortedMatches
      .map((entry) => indexById.get(entry.emailId))
      .filter((index): index is number => index !== undefined);
    const unhiddenVisibleIndexes = excludeHiddenIndexes(visibleIndexes, state.hiddenSourceIndexes);
    const confidenceBySourceIndex: Record<number, number> = {};
    for (const entry of sortedMatches) {
      const sourceIndex = indexById.get(entry.emailId);
      if (sourceIndex !== undefined) {
        confidenceBySourceIndex[sourceIndex] = entry.confidence;
      }
    }
    const summaryLine = `Filtered: ${unhiddenVisibleIndexes.length}/${deps.messageIds.length} emails`;

    return {
      ...loadingState,
      navigation: withNavigationListSize(state.navigation, unhiddenVisibleIndexes.length),
      statusLine: summaryLine,
      smartFilter: {
        ...loadingState.smartFilter,
        status: 'filtered',
        draft: '',
        description,
        summaryLine,
        visibleIndexes: unhiddenVisibleIndexes,
        confidenceBySourceIndex
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
        visibleIndexes: null,
        confidenceBySourceIndex: {}
      }
    };
  }
}

function removeVisibleMessageFromState(
  state: TuiAppState,
  deps: TuiCommandDeps,
  sourceIndex: number,
  actionLabel: string
): TuiAppState {
  const hiddenSourceIndexes: Record<number, true> = {
    ...state.hiddenSourceIndexes,
    [sourceIndex]: true
  };
  const visibleIndexesAfterAction =
    state.smartFilter.visibleIndexes?.filter((index) => index !== sourceIndex) ?? null;
  const confidenceBySourceIndex = { ...state.smartFilter.confidenceBySourceIndex };
  delete confidenceBySourceIndex[sourceIndex];
  const listViewNavigation =
    state.navigation.viewMode === 'detail' ? closeDetailView(state.navigation) : state.navigation;
  const displayedSourceIndexes = excludeHiddenIndexes(
    visibleIndexesAfterAction ?? getAllSourceIndexes(deps.messageIds),
    hiddenSourceIndexes
  );
  const summaryLine =
    state.smartFilter.status === 'filtered' && visibleIndexesAfterAction !== null
      ? `Filtered: ${displayedSourceIndexes.length}/${deps.messageIds.length} emails`
      : state.smartFilter.summaryLine;

  return {
    ...state,
    navigation: withNavigationListSize(listViewNavigation, displayedSourceIndexes.length),
    detailLines: state.navigation.viewMode === 'detail' ? [] : state.detailLines,
    statusLine: `${actionLabel} selected email.`,
    hiddenSourceIndexes,
    smartFilter: {
      ...state.smartFilter,
      summaryLine,
      visibleIndexes: visibleIndexesAfterAction,
      confidenceBySourceIndex
    },
    detailSummary:
      state.navigation.viewMode === 'detail'
        ? {
            ...createDetailSummaryUiState(),
            requestId: state.detailSummary.requestId + 1
          }
        : state.detailSummary
  };
}

async function applyMessageAction(
  state: TuiAppState,
  deps: TuiCommandDeps,
  action: 'archive' | 'delete'
): Promise<TuiAppState> {
  const sourceIndex = getSelectedSourceIndex(state, deps);
  if (sourceIndex === undefined) {
    return {
      ...state,
      statusLine: '(error) No message selected'
    };
  }

  const messageId = deps.messageIds[sourceIndex];
  if (!messageId) {
    return {
      ...state,
      statusLine: '(error) No message selected'
    };
  }

  const actionFn = action === 'archive' ? deps.archiveEmail : deps.deleteEmail;
  const actionLabel = action === 'archive' ? 'Archived' : 'Deleted';

  if (!actionFn) {
    return {
      ...state,
      statusLine: `(error) ${actionLabel} action is unavailable`
    };
  }

  try {
    await actionFn(messageId);
    return removeVisibleMessageFromState(state, deps, sourceIndex, actionLabel);
  } catch (error) {
    const mapped = mapError(error);
    return {
      ...state,
      statusLine: `(error) ${mapped.message}`
    };
  }
}

async function applySummaryToggle(state: TuiAppState, deps: TuiCommandDeps): Promise<TuiAppState> {
  if (state.navigation.viewMode !== 'detail') {
    return state;
  }

  const messageId = state.navigation.detailMessageId ?? getSelectedMessageId(state, deps);
  if (!messageId) {
    return {
      ...state,
      statusLine: '(error) No message selected'
    };
  }

  if (state.detailSummary.mode === 'loading_summary') {
    return state;
  }

  if (state.detailSummary.mode === 'summary' && state.detailSummary.messageId === messageId) {
    return {
      ...state,
      detailSummary: {
        ...state.detailSummary,
        mode: 'full',
        errorMessage: undefined
      },
      statusLine: ''
    };
  }

  if (!deps.summaryService) {
    return {
      ...state,
      statusLine: '(error) AI summary requires AI_PROVIDER, AI_MODEL, and AI_API_KEY.'
    };
  }

  const requestId = state.detailSummary.requestId + 1;
  const fullLines = state.detailSummary.messageId === messageId ? state.detailSummary.fullLines : state.detailLines;
  const rawDetail = state.detailSummary.messageId === messageId ? state.detailSummary.rawDetail : undefined;
  if (!rawDetail) {
    return {
      ...state,
      statusLine: '(error) Raw email detail unavailable for summary generation.'
    };
  }
  const loadingState: TuiAppState = {
    ...state,
    statusLine: 'Generating AI summary...',
    detailSummary: {
      mode: 'loading_summary',
      messageId,
      fullLines,
      rawDetail,
      summaryLines: [],
      requestId,
      errorMessage: undefined
    }
  };
  deps.onStateUpdate?.(loadingState);

  try {
    const result = await deps.summaryService.getOrGenerateSummary({
      messageId,
      subject: rawDetail.subject,
      sender: rawDetail.sender,
      body: rawDetail.body
    });

    return {
      ...loadingState,
      statusLine: result.cacheHit ? 'Loaded cached AI summary.' : 'Generated AI summary.',
      detailSummary: {
        ...loadingState.detailSummary,
        mode: 'summary',
        summaryLines: renderSummaryDetailLines(result.record),
        errorMessage: undefined
      }
    };
  } catch (error) {
    const mapped = mapError(error);
    return {
      ...loadingState,
      statusLine: `(error) ${mapped.message}`,
      detailSummary: {
        ...loadingState.detailSummary,
        mode: 'full',
        summaryLines: [],
        errorMessage: mapped.message
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
    hiddenSourceIndexes: {},
    smartFilter: createSmartFilterUiState(),
    detailSummary: createDetailSummaryUiState()
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

  if (command === 'archive' || command === 'delete') {
    return applyMessageAction(state, deps, command);
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
        const [detailLines, rawDetail] = await Promise.all([
          deps.fetchDetailLines(messageId),
          deps.fetchDetailData?.(messageId)
        ]);
        return {
          ...state,
          navigation: openDetailView(state.navigation, messageId),
          detailLines,
          statusLine: '',
          detailSummary: {
            mode: 'full',
            messageId,
            fullLines: detailLines,
            rawDetail,
            summaryLines: [],
            requestId: state.detailSummary.requestId + 1,
            errorMessage: undefined
          }
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

  if (command === 'summary') {
    return applySummaryToggle(state, deps);
  }

  if (command === 'back' || command === 'escape') {
    return {
      ...state,
      navigation: closeDetailView(state.navigation),
      detailLines: [],
      statusLine: 'Returned to inbox list',
      detailSummary: {
        ...createDetailSummaryUiState(),
        requestId: state.detailSummary.requestId + 1
      }
    };
  }

  // Ignore list movement while detail is open.
  return state;
}

export function renderTuiScreen(listLines: string[], state: TuiAppState): string[] {
  const modeLine = `Mode: ${state.navigation.viewMode}`;
  const viewportRows = state.viewportRows;
  const displayedSourceIndexes = excludeHiddenIndexes(
    state.smartFilter.visibleIndexes ?? listLines.map((_line, index) => index),
    state.hiddenSourceIndexes
  );
  const activeListLines =
    displayedSourceIndexes.length === 0
      ? []
      : displayedSourceIndexes.map((index) => {
          const line = listLines[index] ?? '(unknown message)';
          const confidence = state.smartFilter.confidenceBySourceIndex[index];
          if (confidence === undefined) {
            return line;
          }
          return `${line} ${formatConfidenceIndicator(confidence)}`;
        });
  const body =
    state.navigation.viewMode === 'list'
      ? selectViewportWindow(
          renderSelectableInboxLines(activeListLines, state.navigation.selectedIndex),
          state.navigation.selectedIndex,
          viewportRows
        )
      : state.detailSummary.mode === 'summary'
        ? ['AI Summary', ...state.detailSummary.summaryLines]
        : state.detailSummary.mode === 'loading_summary'
          ? [...state.detailSummary.fullLines, '', 'Generating AI summary...']
          : state.detailSummary.fullLines;
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
      ? 'Keys: j/k or arrows move, enter opens/applies, e archives, # deletes, f filters, Esc clears filter, q quits'
      : 'Keys: s toggles summary/full, b or Esc returns to list, e archives, # deletes, q quits';

  return [modeLine, status, ...filterLines, ...viewport, selectedLine, helpLine];
}

function shouldAcceptStateUpdate(currentState: TuiAppState, nextState: TuiAppState): boolean {
  if (nextState.smartFilter.requestId < currentState.smartFilter.requestId) {
    return false;
  }
  if (nextState.detailSummary.requestId < currentState.detailSummary.requestId) {
    return false;
  }
  return true;
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
      fetchDetailData: props.fetchDetailData,
      archiveEmail: props.archiveEmail,
      deleteEmail: props.deleteEmail,
      emails: props.emails,
      provider: props.provider,
      summaryService: props.summaryService,
      runSmartFilter: props.runSmartFilter,
      onStateUpdate: (nextState) => {
        setState((currentState) =>
          shouldAcceptStateUpdate(currentState, nextState) ? nextState : currentState
        );
      }
    }),
    [
      props.archiveEmail,
      props.deleteEmail,
      props.emails,
      props.fetchDetailLines,
      props.fetchDetailData,
      props.messageIds,
      props.provider,
      props.summaryService,
      props.runSmartFilter
    ]
  );

  const dispatchCommand = useCallback(
    (command: TuiCommand, rawInput = '') => {
      void applyTuiCommand(state, command, commandDeps, rawInput).then((nextState) => {
        setState((currentState) =>
          shouldAcceptStateUpdate(currentState, nextState) ? nextState : currentState
        );
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
