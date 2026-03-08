import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSummaryStore } from '@/adapters/storage/summary_store.js';
import { runInboxCli } from '@/cli/app.js';
import { createEmail } from '@/core/entities.js';

const baseConfig = {
  gmailClientId: 'client-id',
  gmailClientSecret: 'client-secret',
  gmailRedirectUri: 'http://localhost/oauth2',
  logLevel: 'info' as const,
  dbPath: 'data/local.db'
};

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

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

  it('should generate and show summary content from detail mode on s key', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-flow-'));
    tempDirs.push(dir);
    const lines: string[] = [];
    const summarizeEmail = vi.fn().mockResolvedValue({
      summarySentence: 'The email requests a confirmation response.',
      actionItems: ['Reply with confirmation']
    });

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => ({
        ...baseConfig,
        aiConfig: {
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
          maxContextTokens: 32000
        }
      }),
      createAiProvider: () => ({
        classifyEmails: vi.fn().mockResolvedValue({ results: [] }),
        summarizeEmail
      }),
      createSummaryStore: () => createSummaryStore(join(dir, 'email-summaries.json')),
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Need confirmation',
          sender: 'lead@work.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Need confirmation',
        sender: 'lead@work.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: 'Please confirm by EOD.',
        headers: { subject: 'Need confirmation', from: 'lead@work.com' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 's', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(summarizeEmail).toHaveBeenCalledTimes(1);
    const output = lines.join('\n');
    expect(output).toContain('AI Summary');
    expect(output).toContain('The email requests a confirmation response.');
    expect(output).toContain('- Reply with confirmation');
  });

  it('should reuse persisted summary across restarts without a second provider call', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-flow-'));
    tempDirs.push(dir);
    const summaryPath = join(dir, 'email-summaries.json');

    const providerFirst = {
      classifyEmails: vi.fn().mockResolvedValue({ results: [] }),
      summarizeEmail: vi.fn().mockResolvedValue({
        summarySentence: 'Persisted summary sentence.',
        actionItems: ['None']
      })
    };

    const firstStatus = await runInboxCli(['--interactive'], {
      loadConfig: () => ({
        ...baseConfig,
        aiConfig: {
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
          maxContextTokens: 32000
        }
      }),
      createAiProvider: () => providerFirst,
      createSummaryStore: () => createSummaryStore(summaryPath),
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Persist me',
          sender: 'lead@work.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Persist me',
        sender: 'lead@work.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: 'First session body.',
        headers: { subject: 'Persist me', from: 'lead@work.com' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 's', 'quit'],
      writeLine: () => undefined
    });
    expect(firstStatus).toBe(0);
    expect(providerFirst.summarizeEmail).toHaveBeenCalledTimes(1);

    const providerSecond = {
      classifyEmails: vi.fn().mockResolvedValue({ results: [] }),
      summarizeEmail: vi.fn().mockResolvedValue({
        summarySentence: 'Should not be used.',
        actionItems: ['None']
      })
    };
    const secondStatus = await runInboxCli(['--interactive'], {
      loadConfig: () => ({
        ...baseConfig,
        aiConfig: {
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
          maxContextTokens: 32000
        }
      }),
      createAiProvider: () => providerSecond,
      createSummaryStore: () => createSummaryStore(summaryPath),
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Persist me',
          sender: 'lead@work.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Persist me',
        sender: 'lead@work.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: 'Second session body.',
        headers: { subject: 'Persist me', from: 'lead@work.com' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 's', 'quit'],
      writeLine: () => undefined
    });

    expect(secondStatus).toBe(0);
    expect(providerSecond.summarizeEmail).not.toHaveBeenCalled();
  });

  it('should regenerate summary when selected-email cache entry is malformed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-flow-'));
    tempDirs.push(dir);
    const summaryPath = join(dir, 'email-summaries.json');
    await writeFile(
      summaryPath,
      JSON.stringify(
        {
          version: 1,
          summariesByMessageId: {
            'msg-1': 42,
            'msg-2': {
              messageId: 'msg-2',
              summarySentence: 'Existing valid summary.',
              actionItems: ['None'],
              provider: 'openai',
              model: 'gpt-4o-mini',
              createdAt: '2026-03-08T00:00:00.000Z'
            }
          }
        },
        null,
        2
      ),
      'utf8'
    );

    const summarizeEmail = vi.fn().mockResolvedValue({
      summarySentence: 'Regenerated summary sentence.',
      actionItems: ['None']
    });

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => ({
        ...baseConfig,
        aiConfig: {
          provider: 'openai' as const,
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
          maxContextTokens: 32000
        }
      }),
      createAiProvider: () => ({
        classifyEmails: vi.fn().mockResolvedValue({ results: [] }),
        summarizeEmail
      }),
      createSummaryStore: () => createSummaryStore(summaryPath),
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Needs regeneration',
          sender: 'lead@work.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Needs regeneration',
        sender: 'lead@work.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: 'Regenerate from this raw body.',
        headers: { subject: 'Needs regeneration', from: 'lead@work.com' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 's', 'quit'],
      writeLine: () => undefined
    });

    expect(status).toBe(0);
    expect(summarizeEmail).toHaveBeenCalledTimes(1);

    const repaired = JSON.parse(await readFile(summaryPath, 'utf8')) as {
      summariesByMessageId?: Record<string, { summarySentence?: string }>;
    };
    expect(repaired.summariesByMessageId?.['msg-2']?.summarySentence).toBe('Existing valid summary.');
    expect(repaired.summariesByMessageId?.['msg-1']?.summarySentence).toBe('Regenerated summary sentence.');
  });
});
