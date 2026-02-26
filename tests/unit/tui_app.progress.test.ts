import { describe, expect, it, vi } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { applyTuiCommand, createTuiAppState } from '@/tui/app.js';

describe('tui app smart filter progress', () => {
  it('should emit progressive batch status updates while evaluating filter', async () => {
    const emails = [
      createEmail({
        message_id: 'msg-1',
        received_at: Date.parse('2026-02-10T10:00:00Z'),
        subject: 'Alpha'
      }),
      createEmail({
        message_id: 'msg-2',
        received_at: Date.parse('2026-02-11T10:00:00Z'),
        subject: 'Bravo'
      })
    ];

    const onStateUpdate = vi.fn();
    const runSmartFilter = vi.fn().mockImplementation(async (input: {
      onProgress?: (progress: {
        matchingResults: Array<{ emailId: string; matches: boolean; confidence: number }>;
        evaluatedCount: number;
        totalCount: number;
        currentBatch: number;
        totalBatches: number;
      }) => void;
    }) => {
      input.onProgress?.({
        matchingResults: [],
        evaluatedCount: 1,
        totalCount: 2,
        currentBatch: 1,
        totalBatches: 2
      });
      input.onProgress?.({
        matchingResults: [{ emailId: 'msg-2', matches: true, confidence: 0.92 }],
        evaluatedCount: 2,
        totalCount: 2,
        currentBatch: 2,
        totalBatches: 2
      });

      return {
        allResults: [{ emailId: 'msg-2', matches: true, confidence: 0.92 }],
        matchingResults: [{ emailId: 'msg-2', matches: true, confidence: 0.92 }],
        totalEvaluated: 2
      };
    });

    const deps = {
      messageIds: emails.map((email) => email.message_id),
      fetchDetailLines: async () => ['Detail View'],
      emails,
      provider: { classifyEmails: vi.fn() },
      runSmartFilter,
      onStateUpdate
    };

    let state = createTuiAppState(emails.length);
    state = await applyTuiCommand(state, 'filter', deps, '');
    state = await applyTuiCommand(state, 'noop', deps, 'priority');
    state = await applyTuiCommand(state, 'open', deps, '');

    const statusLines = onStateUpdate.mock.calls
      .map((call) => call[0]?.statusLine)
      .filter((value): value is string => typeof value === 'string');

    expect(statusLines).toContain('Evaluating batch 1/2...');
    expect(statusLines).toContain('Evaluating batch 2/2...');
    expect(state.statusLine).toBe('Filtered: 1/2 emails');
  });
});
