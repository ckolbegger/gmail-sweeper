import { describe, expect, it } from 'vitest';

import { runInboxCli } from '@/cli/app.js';
import { createEmail } from '@/core/entities.js';

const baseConfig = {
  gmailClientId: 'client-id',
  gmailClientSecret: 'client-secret',
  gmailRedirectUri: 'http://localhost/oauth2',
  logLevel: 'info' as const,
  dbPath: 'data/local.db',
  aiConfig: {
    provider: 'anthropic' as const,
    model: 'claude-sonnet',
    apiKey: 'test-key',
    maxContextTokens: 32000
  }
};

describe('smart filter configured env flow', () => {
  it('should provide configured AI provider to interactive session when AI config is present', async () => {
    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Event invitation',
          sender: 'events@example.com',
          received_at: Date.parse('2026-01-31T09:00:00Z')
        })
      ],
      runInkSession: async (options) => {
        expect(options.provider).toBeTruthy();
        expect(options.summaryService).toBeTruthy();
        expect(options.emails).toHaveLength(1);
        expect(options.emails?.[0]?.message_id).toBe('msg-1');
      }
    });

    expect(status).toBe(0);
  });
});
