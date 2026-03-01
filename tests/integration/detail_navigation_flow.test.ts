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

  it('should prefer html anchor text for matching url labels in detail view', async () => {
    const lines: string[] = [];

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Anchors',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Anchors',
        sender: 'first@example.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: 'Read https://example.com/news?utm_source=test#top',
        html_body: '<a href="https://example.com/news">Daily Briefing</a>',
        headers: { subject: 'Anchors' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('Daily Briefing');
    expect(lines.join('\n')).not.toContain('https://example.com/news');
  });

  it('should silently fall back to hostname when html parsing is skipped', async () => {
    const lines: string[] = [];
    const oversizedHtml = `<a href="https://example.com/path">Preferred Label</a>${'x'.repeat(1024 * 1024)}`;

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Oversized html',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Oversized html',
        sender: 'first@example.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: 'Open https://example.com/path',
        html_body: oversizedHtml,
        headers: { subject: 'Oversized html' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('example.com');
    expect(lines.join('\n')).not.toContain('Preferred Label');
    expect(lines.join('\n')).not.toContain('(error)');
  });

  it('should avoid rendering unbroken long raw urls in detail output', async () => {
    const lines: string[] = [];
    const longUrl =
      'https://this-is-a-very-long-hostname-used-for-rendering-validation.example.com/path/with/many/segments/that/should/not/dominate/the/detail/pane';

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Long URL',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Long URL',
        sender: 'first@example.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: `Read ${longUrl} now`,
        headers: { subject: 'Long URL' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    const output = lines.join('\n');
    expect(output).not.toContain(longUrl);
    expect(output).toContain('...');
  });
});
