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

describe('detail navigation key workflow', () => {
  it('should move selection with up and down inputs', async () => {
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
        subject: messageId,
        sender: 'sender@example.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: `Body ${messageId}`,
        headers: { subject: messageId },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['down', 'up', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('Selected #2');
    expect(lines.join('\n')).toContain('Selected #1');
    expect(lines.join('\n')).toContain('> [2]');
    expect(lines.join('\n')).toContain('> [1]');
  });

  it('should open selected detail with enter and close detail with back', async () => {
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
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'First',
        sender: 'first@example.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: 'First body',
        headers: { subject: 'First' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 'down', 'back', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('Detail View');
    expect(lines.join('\n')).toContain('Returned to inbox list');
    expect(lines.join('\n')).not.toContain('Use back before moving list selection.');
  });

  it('should keep list and detail state in sync after repeated navigation', async () => {
    const lines: string[] = [];
    const getEmailDetail = vi.fn().mockImplementation(async (_gmail, messageId: string) => ({
      message_id: messageId,
      subject: messageId,
      sender: 'sender@example.com',
      received_at: Date.parse('2026-02-08T10:00:00Z'),
      body: `Body ${messageId}`,
      headers: { subject: messageId },
      labels: ['INBOX'],
      is_read: true
    }));

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
      getEmailDetail,
      navigationInputs: ['down', 'enter', 'back', 'up', 'enter', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(getEmailDetail).toHaveBeenCalledTimes(2);
    expect(lines.join('\n')).toContain('Body msg-2');
    expect(lines.join('\n')).toContain('Body msg-1');
  });
});
