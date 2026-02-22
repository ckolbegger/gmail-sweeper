import { describe, expect, it, vi } from 'vitest';

import { runInboxCli } from '@/cli/app.js';
import { createEmail } from '@/core/entities.js';

const baseConfig = {
  gmailClientId: 'client-id',
  gmailClientSecret: 'client-secret',
  gmailRedirectUri: 'http://localhost/oauth2',
  logLevel: 'info' as const,
  dbPath: 'data/local.db',
  aiConfig: {
    provider: 'openai' as const,
    model: 'gpt-4o-mini',
    apiKey: 'test-key',
    maxContextTokens: 32000
  }
};

describe('cli AI config wiring', () => {
  it('should create AI provider from config and pass it to interactive Ink session', async () => {
    const createAiProvider = vi.fn().mockReturnValue({
      classifyEmails: vi.fn().mockResolvedValue({ results: [] })
    });
    const runInkSession = vi.fn().mockResolvedValue(undefined);

    const code = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({
        accessToken: 'cached-access',
        refreshToken: 'cached-refresh'
      }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'First',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-09T08:00:00Z')
        })
      ],
      createAiProvider,
      runInkSession
    });

    expect(code).toBe(0);
    expect(createAiProvider).toHaveBeenCalledOnce();
    expect(createAiProvider).toHaveBeenCalledWith(baseConfig.aiConfig);
    expect(runInkSession).toHaveBeenCalledOnce();

    const session = runInkSession.mock.calls[0]?.[0];
    expect(session.provider).toBeTruthy();
    expect(session.emails).toHaveLength(1);
    expect(session.emails[0]?.message_id).toBe('msg-1');
  });
});
