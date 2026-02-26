import { describe, expect, it, vi } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { AiProviderError, mapError } from '@/core/errors.js';
import { applyTuiCommand, createTuiAppState } from '@/tui/app.js';
import { mapInputToCommand } from '@/tui/input_controller.js';

describe('AI error handling', () => {
  it('should preserve AiProviderError identity when mapped', () => {
    const error = new AiProviderError('Invalid JSON response from provider');
    const mapped = mapError(error);

    expect(mapped).toBe(error);
    expect(mapped.code).toBe('AI_PROVIDER_ERROR');
  });

  it('should surface AI provider errors in filter mode status line', async () => {
    const emails = [
      createEmail({
        message_id: 'msg-1',
        received_at: Date.parse('2026-02-10T10:00:00Z'),
        subject: 'Subject'
      })
    ];
    const deps = {
      messageIds: ['msg-1'],
      fetchDetailLines: async () => ['Detail View'],
      emails,
      provider: { classifyEmails: vi.fn() },
      runSmartFilter: vi
        .fn()
        .mockRejectedValue(new AiProviderError('Invalid JSON response from Anthropic provider'))
    };

    let state = createTuiAppState(1);
    state = await applyTuiCommand(state, mapInputToCommand('f', {}), deps, '');
    state = await applyTuiCommand(state, mapInputToCommand('war updates', {}), deps, 'war updates');
    state = await applyTuiCommand(state, mapInputToCommand('', { return: true }), deps, '');

    expect(state.smartFilter.status).toBe('error');
    expect(state.statusLine).toContain('Invalid JSON response from Anthropic provider');
  });
});
