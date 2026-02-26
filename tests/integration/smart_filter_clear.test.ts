import { describe, expect, it, vi } from 'vitest';

import { createEmail, type Email } from '@/core/entities.js';
import { applyTuiCommand, createTuiAppState, renderTuiScreen } from '@/tui/app.js';
import { renderInboxList } from '@/tui/inbox_list.js';
import { mapInputToCommand } from '@/tui/input_controller.js';

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

describe('smart filter clear integration', () => {
  it('should clear an active filter and immediately restore full list', async () => {
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [
        { emailId: 'msg-1', matches: false, confidence: 0.1 },
        { emailId: 'msg-2', matches: true, confidence: 0.92 },
        { emailId: 'msg-3', matches: false, confidence: 0.2 }
      ],
      matchingResults: [{ emailId: 'msg-2', matches: true, confidence: 0.92 }],
      totalEvaluated: 3
    });
    const deps = {
      messageIds: EMAILS.map((email) => email.message_id),
      fetchDetailLines: async () => ['Detail View'],
      emails: EMAILS,
      provider: { classifyEmails: vi.fn() },
      runSmartFilter
    };

    let state = createTuiAppState(EMAILS.length);
    const baseLines = renderInboxList(EMAILS);

    state = await applyTuiCommand(state, mapInputToCommand('f', {}), deps, '');
    state = await applyTuiCommand(state, mapInputToCommand('receipts', {}), deps, 'receipts');
    state = await applyTuiCommand(state, mapInputToCommand('', { return: true }), deps, '');
    expect(renderTuiScreen(baseLines, state).join('\n')).toContain('Filtered: 1/3 emails');

    state = await applyTuiCommand(state, mapInputToCommand('', { escape: true }), deps, '');
    const cleared = renderTuiScreen(baseLines, state).join('\n');

    expect(cleared).toContain('Smart filter cleared.');
    expect(cleared).toContain('Newsletter');
    expect(cleared).toContain('Receipt from Store');
    expect(cleared).toContain('Vacation plans');
    expect(cleared).not.toContain('Filtered: 1/3 emails');
  });
});
