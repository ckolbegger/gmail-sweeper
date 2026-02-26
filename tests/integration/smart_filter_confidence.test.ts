import { describe, expect, it, vi } from 'vitest';

import { createEmail, type Email } from '@/core/entities.js';
import { applyTuiCommand, createTuiAppState, renderTuiScreen } from '@/tui/app.js';
import { renderInboxList } from '@/tui/inbox_list.js';
import { mapInputToCommand } from '@/tui/input_controller.js';

const EMAILS: Email[] = [
  createEmail({
    message_id: 'msg-1',
    received_at: Date.parse('2026-02-10T10:00:00Z'),
    subject: 'Alpha',
    sender: 'a@example.com'
  }),
  createEmail({
    message_id: 'msg-2',
    received_at: Date.parse('2026-02-11T10:00:00Z'),
    subject: 'Bravo',
    sender: 'b@example.com'
  }),
  createEmail({
    message_id: 'msg-3',
    received_at: Date.parse('2026-02-12T10:00:00Z'),
    subject: 'Charlie',
    sender: 'c@example.com'
  })
];

describe('smart filter confidence integration', () => {
  it('should show confidence indicators and order matches by highest confidence first', async () => {
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [
        { emailId: 'msg-1', matches: true, confidence: 0.61 },
        { emailId: 'msg-2', matches: true, confidence: 0.93 },
        { emailId: 'msg-3', matches: true, confidence: 0.52 }
      ],
      // Intentionally unsorted from dependency to ensure UI sorts.
      matchingResults: [
        { emailId: 'msg-1', matches: true, confidence: 0.61 },
        { emailId: 'msg-3', matches: true, confidence: 0.52 },
        { emailId: 'msg-2', matches: true, confidence: 0.93 }
      ],
      totalEvaluated: 3
    });
    const deps = {
      messageIds: EMAILS.map((email) => email.message_id),
      fetchDetailLines: async () => ['Detail View'],
      emails: EMAILS,
      provider: { classifyEmails: vi.fn() },
      runSmartFilter
    };

    const baseLines = renderInboxList(EMAILS);
    let state = createTuiAppState(EMAILS.length);
    state = await applyTuiCommand(state, mapInputToCommand('f', {}), deps, '');
    state = await applyTuiCommand(state, mapInputToCommand('priority mail', {}), deps, 'priority mail');
    state = await applyTuiCommand(state, mapInputToCommand('', { return: true }), deps, '');

    const screen = renderTuiScreen(baseLines, state).join('\n');
    expect(screen).toContain('[high 93%]');
    expect(screen).toContain('[medium 61%]');
    expect(screen).toContain('[medium 52%]');

    expect(screen.indexOf('Bravo')).toBeLessThan(screen.indexOf('Alpha'));
    expect(screen.indexOf('Alpha')).toBeLessThan(screen.indexOf('Charlie'));
  });
});
