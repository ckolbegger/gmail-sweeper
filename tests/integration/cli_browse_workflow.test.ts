import { describe, expect, it } from 'vitest';

import { runInboxCli } from '@/cli/app.js';
import { createEmail } from '@/core/entities.js';

const baseConfig = {
  gmailClientId: 'client-id',
  gmailClientSecret: 'client-secret',
  gmailRedirectUri: 'http://localhost/oauth2',
  logLevel: 'info' as const,
  dbPath: 'data/local.db'
};

describe('CLI browse workflow integration', () => {
  it('should perform auth bootstrap path then exit with next-step instructions', async () => {
    const lines: string[] = [];
    const status = await runInboxCli([], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => null,
      createAuthUrl: () => 'http://auth.local',
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(1);
    expect(lines.join('\n')).toContain('No saved Gmail session');
    expect(lines.join('\n')).toContain('Re-run with --auth-code');
  });

  it('should render filtered inbox results when valid tokens are available', async () => {
    const lines: string[] = [];
    const status = await runInboxCli(['--label', 'WORK'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'a',
          subject: 'Team sync',
          sender: 'lead@work.com',
          labels: ['WORK'],
          received_at: Date.parse('2026-01-31T09:00:00Z')
        }),
        createEmail({
          message_id: 'b',
          subject: 'Sale',
          sender: 'promo@shop.com',
          labels: ['PROMOTIONS'],
          received_at: Date.parse('2026-01-30T09:00:00Z')
        })
      ],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('Team sync');
    expect(lines.join('\n')).not.toContain('Sale');
  });

  it('should show empty state output when filters produce no matches', async () => {
    const lines: string[] = [];
    const status = await runInboxCli(['--sender', 'nobody@example.com'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'a',
          subject: 'Team sync',
          sender: 'lead@work.com',
          received_at: Date.parse('2026-01-31T09:00:00Z')
        })
      ],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('(no messages)');
  });
});
