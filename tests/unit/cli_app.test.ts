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

describe('CLI inbox workflow', () => {
  it('should request auth when no stored tokens are present', async () => {
    const lines: string[] = [];
    const code = await runInboxCli([], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => null,
      createAuthUrl: () => 'http://auth.local',
      writeLine: (line) => lines.push(line)
    });

    expect(code).toBe(1);
    expect(lines.join('\n')).toContain('http://auth.local');
  });

  it('should exchange auth code and persist tokens when provided', async () => {
    const lines: string[] = [];
    const writeAuthTokens = vi.fn().mockResolvedValue(undefined);
    const listInboxEmails = vi.fn().mockResolvedValue([]);
    const createGmailClient = vi.fn().mockReturnValue({ users: { messages: {} } });

    const code = await runInboxCli(['--auth-code', 'test-code'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => null,
      writeAuthTokens,
      exchangeAuthCode: async () => ({
        accessToken: 'new-access',
        refreshToken: 'new-refresh'
      }),
      createGmailClient,
      listInboxEmails,
      writeLine: (line) => lines.push(line)
    });

    expect(code).toBe(0);
    expect(writeAuthTokens).toHaveBeenCalledOnce();
    expect(listInboxEmails).toHaveBeenCalledOnce();
    expect(lines.join('\n')).toContain('Saved auth tokens');
  });

  it('should load inbox, apply filters, and render summarized output', async () => {
    const lines: string[] = [];

    const code = await runInboxCli(['--sender', 'lead@work.com', '--limit', '5'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({
        accessToken: 'cached-access',
        refreshToken: 'cached-refresh'
      }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Team update',
          sender: 'lead@work.com',
          received_at: Date.parse('2026-02-01T08:00:00Z')
        }),
        createEmail({
          message_id: 'msg-2',
          subject: 'Promo',
          sender: 'promo@shop.com',
          received_at: Date.parse('2026-01-30T08:00:00Z')
        })
      ],
      writeLine: (line) => lines.push(line)
    });

    expect(code).toBe(0);
    expect(lines[0]).toContain('Loaded 2 emails, showing 1');
    expect(lines.join('\n')).toContain('Team update');
    expect(lines.join('\n')).not.toContain('Promo');
  });

  it('should start Ink UI after inbox data is loaded and pass detail callback', async () => {
    const runInkSession = vi.fn().mockResolvedValue(undefined);
    const getEmailDetail = vi.fn().mockResolvedValue({
      message_id: 'msg-2',
      subject: 'Second',
      sender: 'second@example.com',
      received_at: Date.parse('2026-02-08T10:00:00Z'),
      body: 'Second body',
      headers: { subject: 'Second' },
      labels: ['INBOX'],
      is_read: true
    });

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
        }),
        createEmail({
          message_id: 'msg-2',
          subject: 'Second',
          sender: 'second@example.com',
          received_at: Date.parse('2026-02-08T08:00:00Z')
        })
      ],
      getEmailDetail,
      runInkSession
    });

    expect(code).toBe(0);
    expect(runInkSession).toHaveBeenCalledOnce();

    const session = runInkSession.mock.calls[0]?.[0];
    expect(session.listLines).toHaveLength(2);
    expect(session.messageIds).toEqual(['msg-1', 'msg-2']);

    const preview = await session.fetchDetailLines('msg-2');
    expect(preview.join('\n')).toContain('Second body');
    expect(getEmailDetail).toHaveBeenCalledWith(expect.anything(), 'msg-2', { userId: 'me' });
  });

  it('should pass archive/delete actions into interactive session', async () => {
    const runInkSession = vi.fn().mockResolvedValue(undefined);
    const modify = vi.fn().mockResolvedValue(undefined);
    const trash = vi.fn().mockResolvedValue(undefined);

    const code = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({
        accessToken: 'cached-access',
        refreshToken: 'cached-refresh'
      }),
      createGmailClient: () => ({ users: { messages: { modify, trash } } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'First',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-09T08:00:00Z')
        }),
        createEmail({
          message_id: 'msg-2',
          subject: 'Second',
          sender: 'second@example.com',
          received_at: Date.parse('2026-02-08T08:00:00Z')
        })
      ],
      runInkSession
    });

    expect(code).toBe(0);
    expect(runInkSession).toHaveBeenCalledOnce();

    const session = runInkSession.mock.calls[0]?.[0];
    await session.archiveEmail('msg-1');
    await session.deleteEmail('msg-2');

    expect(modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg-1',
      removeLabelIds: ['INBOX']
    });
    expect(trash).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg-2'
    });
  });

  it('should wire summary service into interactive session when provider supports summaries', async () => {
    const runInkSession = vi.fn().mockResolvedValue(undefined);

    const code = await runInboxCli(['--interactive'], {
      loadConfig: () => ({
        ...baseConfig,
        aiConfig: {
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
          maxContextTokens: 32000
        }
      }),
      readAuthTokens: async () => ({
        accessToken: 'cached-access',
        refreshToken: 'cached-refresh'
      }),
      createAiProvider: () => ({
          classifyEmails: vi.fn().mockResolvedValue({ results: [] }),
          summarizeEmail: vi.fn().mockResolvedValue({
            summarySentence: 'Summary sentence.',
            actionItems: ['None']
          })
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
      runInkSession
    });

    expect(code).toBe(0);
    expect(runInkSession).toHaveBeenCalledOnce();
    const session = runInkSession.mock.calls[0]?.[0];
    expect(session.summaryService).toBeTruthy();
  });
});
