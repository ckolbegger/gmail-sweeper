import { render } from 'ink';
import { createElement } from 'react';

import type { AiProvider } from '@/adapters/ai/provider.js';
import type { Email } from '@/core/entities.js';
import type { EmailSummaryService } from '@/services/email_summary_service.js';
import { applyTuiCommand, createTuiAppState, InkInboxApp, renderTuiScreen } from '@/tui/app.js';
import { parseCommandToken } from '@/tui/input_controller.js';

export interface RunInkSessionOptions {
  listLines: string[];
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
  viewportRows?: number;
  scriptedCommands?: string[];
  onFrame?: (frame: string[]) => void;
  writeFrame?: (frame: string[]) => void;
}

export interface InkRendererInstance {
  waitUntilExit: () => Promise<void>;
  unmount: () => void;
  cleanupInput?: () => void;
}

export interface InkRuntimeDeps {
  createRenderer?: (options: RunInkSessionOptions) => InkRendererInstance;
  stdin?: {
    setRawMode?: (mode: boolean) => void;
    pause: () => void;
  };
}

function inferViewportRows(): number {
  const terminalRows = process.stdout.rows;
  if (!terminalRows || terminalRows <= 0) {
    return 25;
  }

  return Math.max(8, terminalRows - 6);
}

function defaultCreateRenderer(options: RunInkSessionOptions): InkRendererInstance {
  let resolveExit: (() => void) | undefined;
  const waitForExit = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });

  const app = render(
    createElement(InkInboxApp, {
      listLines: options.listLines,
      messageIds: options.messageIds,
      fetchDetailLines: options.fetchDetailLines,
      fetchDetailData: options.fetchDetailData,
      archiveEmail: options.archiveEmail,
      deleteEmail: options.deleteEmail,
      emails: options.emails,
      provider: options.provider,
      summaryService: options.summaryService,
      viewportRows: options.viewportRows ?? inferViewportRows(),
      onExit: () => resolveExit?.()
    }),
    { exitOnCtrlC: false }
  );

  return {
    waitUntilExit: async () => {
      await waitForExit;
    },
    unmount: () => {
      app.unmount();
    }
  };
}

async function runScriptedInkSession(options: RunInkSessionOptions): Promise<void> {
  let state = createTuiAppState(options.messageIds.length, options.viewportRows);
  const emitFrame = (frame: string[]): void => {
    options.onFrame?.(frame);
    options.writeFrame?.(frame);
  };

  emitFrame(renderTuiScreen(options.listLines, state));

  for (const token of options.scriptedCommands ?? []) {
    state = await applyTuiCommand(state, parseCommandToken(token), {
      messageIds: options.messageIds,
      fetchDetailLines: options.fetchDetailLines,
      fetchDetailData: options.fetchDetailData,
      archiveEmail: options.archiveEmail,
      deleteEmail: options.deleteEmail,
      emails: options.emails,
      provider: options.provider,
      summaryService: options.summaryService,
      onStateUpdate: (nextState) => {
        state = nextState;
        emitFrame(renderTuiScreen(options.listLines, state));
      }
    });
    emitFrame(renderTuiScreen(options.listLines, state));

    if (state.shouldExit) {
      break;
    }
  }
}

export async function runInkSession(
  options: RunInkSessionOptions,
  deps: InkRuntimeDeps = {}
): Promise<void> {
  if ((options.scriptedCommands?.length ?? 0) > 0) {
    await runScriptedInkSession(options);
    return;
  }

  const createRenderer = deps.createRenderer ?? defaultCreateRenderer;
  const renderer = createRenderer(options);
  const stdin = deps.stdin ?? process.stdin;

  try {
    await renderer.waitUntilExit();
  } finally {
    renderer.cleanupInput?.();
    renderer.unmount();
    stdin.setRawMode?.(false);
    stdin.pause();
  }
}
