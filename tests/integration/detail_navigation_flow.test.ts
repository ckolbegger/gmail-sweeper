import { describe, expect, it, vi } from 'vitest';

import { runInboxCli } from '@/cli/app.js';
import { createEmail } from '@/core/entities.js';

const baseConfig = {
  gmailClientId: 'client-id',
  gmailClientSecret: 'client-secret',
  gmailRedirectUri: 'http://localhost/oauth2',
  logLevel: 'info' as const,
  dbPath: 'data/local.db'
};

describe('detail navigation flow integration', () => {
  it('should open detail for the selected inbox row', async () => {
    const lines: string[] = [];
    const getEmailDetail = vi.fn().mockResolvedValue({
      message_id: 'msg-1',
      subject: 'Team update',
      sender: 'lead@work.com',
      received_at: Date.parse('2026-02-08T10:00:00Z'),
      body: 'Detail body',
      headers: { subject: 'Team update', from: 'lead@work.com' },
      labels: ['INBOX'],
      is_read: false
    });

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Team update',
          sender: 'lead@work.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail,
      navigationInputs: ['enter', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(getEmailDetail).toHaveBeenCalledWith(expect.anything(), 'msg-1', expect.anything());
    expect(lines.join('\n')).toContain('Detail body');
  });

  it('should return to inbox list while preserving previous selection', async () => {
    const lines: string[] = [];

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'First',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        }),
        createEmail({
          message_id: 'msg-2',
          subject: 'Second',
          sender: 'second@example.com',
          received_at: Date.parse('2026-02-07T10:00:00Z')
        })
      ],
      getEmailDetail: async (_gmail, messageId) => ({
        message_id: messageId,
        subject: messageId === 'msg-1' ? 'First' : 'Second',
        sender: 'sender@example.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: `Body ${messageId}`,
        headers: { subject: messageId },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['down', 'enter', 'back', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('Body msg-2');
    expect(lines.join('\n')).toContain('Selected #2');
  });

  it('should handle missing detail payload with user-safe error output', async () => {
    const lines: string[] = [];

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'First',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => {
        throw new Error('detail missing');
      },
      navigationInputs: ['enter', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('(error)');
  });
});
