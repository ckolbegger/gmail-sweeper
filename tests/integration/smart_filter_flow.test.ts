import { describe, expect, it, vi } from 'vitest';

import { createEmail, type Email } from '@/core/entities.js';
import * as tuiApp from '@/tui/app.js';
import { renderInboxList } from '@/tui/inbox_list.js';
import * as inputController from '@/tui/input_controller.js';

const EMAILS: Email[] = [
  createEmail({
    message_id: 'msg-1',
    received_at: Date.parse('2026-02-10T10:00:00Z'),
    subject: 'Newsletter',
    sender: 'news@example.com'
  }),
  createEmail({
    message_id: 'msg-2',
    received_at: Date.parse('2026-02-11T10:00:00Z'),
    subject: 'Receipt from Store',
    sender: 'billing@shop.com'
  }),
  createEmail({
    message_id: 'msg-3',
    received_at: Date.parse('2026-02-12T10:00:00Z'),
    subject: 'Vacation plans',
    sender: 'friend@example.com'
  })
];

type TuiAppState = ReturnType<typeof tuiApp.createTuiAppState>;

type ApplyFilterCommand = (
  state: TuiAppState,
  command: string,
  deps: {
    messageIds: string[];
    fetchDetailLines: (messageId: string) => Promise<string[]>;
    emails: Email[];
    provider: { classifyEmails: ReturnType<typeof vi.fn> };
    runSmartFilter: ReturnType<typeof vi.fn>;
  },
  rawInput?: string
) => Promise<TuiAppState>;

function getApplyTuiCommand(): ApplyFilterCommand {
  return tuiApp.applyTuiCommand as unknown as ApplyFilterCommand;
}

function getMapInputToCommand(): (input: string, key: inputController.TuiKeyInfo) => string {
  return inputController.mapInputToCommand as unknown as (
    input: string,
    key: inputController.TuiKeyInfo
  ) => string;
}

describe('smart filter flow integration', () => {
  it('should complete filter and clear cycle from the inbox list view', async () => {
    const applyTuiCommand = getApplyTuiCommand();
    const mapInputToCommand = getMapInputToCommand();
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [
        { emailId: 'msg-1', matches: false, confidence: 0.1 },
        { emailId: 'msg-2', matches: true, confidence: 0.92 },
        { emailId: 'msg-3', matches: false, confidence: 0.2 }
      ],
      matchingResults: [{ emailId: 'msg-2', matches: true, confidence: 0.92 }],
      totalEvaluated: 3
    });

    let state = tuiApp.createTuiAppState(EMAILS.length);
    const deps = {
      messageIds: EMAILS.map((email) => email.message_id),
      fetchDetailLines: async () => ['Detail View'],
      emails: EMAILS,
      provider: { classifyEmails: vi.fn() },
      runSmartFilter
    };

    const baseLines = renderInboxList(EMAILS);

    state = await applyTuiCommand(state, mapInputToCommand('f', {}), deps);
    state = await applyTuiCommand(state, mapInputToCommand('receipts', {}), deps, 'receipts');
    state = await applyTuiCommand(state, mapInputToCommand('', { return: true }), deps, '');

    const filteredScreen = tuiApp.renderTuiScreen(baseLines, state).join('\n');
    expect(filteredScreen).toContain('Filtered: 1/3 emails');
    expect(filteredScreen).toContain('Receipt from Store');
    expect(filteredScreen).not.toContain('Newsletter');
    expect(runSmartFilter).toHaveBeenCalledOnce();

    state = await applyTuiCommand(state, mapInputToCommand('', { escape: true }), deps, '');

    const clearedScreen = tuiApp.renderTuiScreen(baseLines, state).join('\n');
    expect(clearedScreen).toContain('Newsletter');
    expect(clearedScreen).toContain('Receipt from Store');
    expect(clearedScreen).toContain('Vacation plans');
  });
});
