import { describe, expect, it, vi } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { applyTuiCommand, createTuiAppState } from '@/tui/app.js';
import { mapInputToCommand } from '@/tui/input_controller.js';

const EMAILS = [
  createEmail({
    message_id: 'msg-1',
    received_at: Date.parse('2026-02-10T10:00:00Z'),
    subject: 'First'
  }),
  createEmail({
    message_id: 'msg-2',
    received_at: Date.parse('2026-02-11T10:00:00Z'),
    subject: 'Second'
  })
];

const DEPS = {
  messageIds: EMAILS.map((email) => email.message_id),
  fetchDetailLines: async () => ['Detail View'],
  emails: EMAILS,
  provider: { classifyEmails: vi.fn() },
  runSmartFilter: vi.fn().mockResolvedValue({
    allResults: [],
    matchingResults: [],
    totalEvaluated: 2
  })
};

describe('filter input mode command isolation', () => {
  it('should keep q as text input instead of quitting while typing filter text', async () => {
    let state = createTuiAppState(EMAILS.length);

    state = await applyTuiCommand(state, mapInputToCommand('f', {}), DEPS, '');
    state = await applyTuiCommand(state, mapInputToCommand('q', {}), DEPS, 'q');

    expect(state.smartFilter.status).toBe('input');
    expect(state.smartFilter.draft).toBe('q');
    expect(state.shouldExit).toBe(false);
  });

  it('should keep j and k as text input instead of moving list selection', async () => {
    let state = createTuiAppState(EMAILS.length);

    state = await applyTuiCommand(state, mapInputToCommand('f', {}), DEPS, '');
    state = await applyTuiCommand(state, mapInputToCommand('j', {}), DEPS, 'j');
    state = await applyTuiCommand(state, mapInputToCommand('k', {}), DEPS, 'k');

    expect(state.navigation.selectedIndex).toBe(0);
    expect(state.smartFilter.status).toBe('input');
    expect(state.smartFilter.draft).toBe('jk');
  });
});
