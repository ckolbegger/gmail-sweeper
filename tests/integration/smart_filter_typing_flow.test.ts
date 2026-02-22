import { describe, expect, it, vi } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { applyTuiCommand, createTuiAppState } from '@/tui/app.js';
import { mapInputToCommand } from '@/tui/input_controller.js';

const FILTER_TEXT = 'emails with invitations to an event';

const EMAILS = [
  createEmail({
    message_id: 'msg-1',
    received_at: Date.parse('2026-02-10T10:00:00Z'),
    subject: 'Team lunch invitation',
    sender: 'events@company.com'
  }),
  createEmail({
    message_id: 'msg-2',
    received_at: Date.parse('2026-02-11T10:00:00Z'),
    subject: 'Invoice #7781',
    sender: 'billing@vendor.com'
  }),
  createEmail({
    message_id: 'msg-3',
    received_at: Date.parse('2026-02-12T10:00:00Z'),
    subject: 'Birthday party invite',
    sender: 'friend@example.com'
  })
];

describe('smart filter typing integration', () => {
  it('should allow typing full filter text before validation/submission', async () => {
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [
        { emailId: 'msg-1', matches: true, confidence: 0.9 },
        { emailId: 'msg-2', matches: false, confidence: 0.1 },
        { emailId: 'msg-3', matches: true, confidence: 0.86 }
      ],
      matchingResults: [
        { emailId: 'msg-1', matches: true, confidence: 0.9 },
        { emailId: 'msg-3', matches: true, confidence: 0.86 }
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

    let state = createTuiAppState(EMAILS.length);
    state = await applyTuiCommand(state, mapInputToCommand('f', {}), deps, '');

    for (const char of FILTER_TEXT) {
      state = await applyTuiCommand(state, mapInputToCommand(char, {}), deps, char);
    }

    expect(state.smartFilter.status).toBe('input');
    expect(state.smartFilter.draft).toBe(FILTER_TEXT);
    expect(state.shouldExit).toBe(false);
    expect(runSmartFilter).not.toHaveBeenCalled();

    state = await applyTuiCommand(state, mapInputToCommand('', { return: true }), deps, '');

    expect(runSmartFilter).toHaveBeenCalledOnce();
    expect(runSmartFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        description: FILTER_TEXT
      })
    );
    expect(state.smartFilter.status).toBe('filtered');
  });

  it('should submit filter when Enter provides carriage-return raw input', async () => {
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [{ emailId: 'msg-1', matches: true, confidence: 0.9 }],
      matchingResults: [{ emailId: 'msg-1', matches: true, confidence: 0.9 }],
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
    state = await applyTuiCommand(state, mapInputToCommand('f', {}), deps, '');
    state = await applyTuiCommand(state, mapInputToCommand(FILTER_TEXT, {}), deps, FILTER_TEXT);

    state = await applyTuiCommand(state, mapInputToCommand('\r', { return: true }), deps, '\r');

    expect(runSmartFilter).toHaveBeenCalledOnce();
    expect(runSmartFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        description: FILTER_TEXT
      })
    );
    expect(state.smartFilter.status).toBe('filtered');
  });

  it('should submit filter when Enter arrives as newline noop input', async () => {
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [{ emailId: 'msg-1', matches: true, confidence: 0.9 }],
      matchingResults: [{ emailId: 'msg-1', matches: true, confidence: 0.9 }],
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
    state = await applyTuiCommand(state, mapInputToCommand('f', {}), deps, '');
    state = await applyTuiCommand(state, mapInputToCommand(FILTER_TEXT, {}), deps, FILTER_TEXT);

    state = await applyTuiCommand(state, mapInputToCommand('\n', {}), deps, '\n');

    expect(runSmartFilter).toHaveBeenCalledOnce();
    expect(runSmartFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        description: FILTER_TEXT
      })
    );
    expect(state.smartFilter.status).toBe('filtered');
  });
});
