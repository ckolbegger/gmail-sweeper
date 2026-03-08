import { mkdtemp, rm } from 'node:fs/promises';
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

  it('should keep whitespace-only blank runs collapsed in detail output during key navigation', async () => {
    const lines: string[] = [];

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: {} } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'Spacing',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      getEmailDetail: async () => ({
        message_id: 'msg-1',
        subject: 'Spacing',
        sender: 'first@example.com',
        received_at: Date.parse('2026-02-08T10:00:00Z'),
        body: ['Top', '', '', '', 'Middle', '   ', '   ', '', '', 'Bottom'].join('\n'),
        headers: { subject: 'Spacing' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 'back', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    const output = lines.join('\n');
    const detailSegment = output
      .split('Detail View')[1]
      ?.split('Keys: s toggles summary/full, b or Esc returns to list, e archives, # deletes, q quits')[0];
    expect(detailSegment).toBeDefined();
    expect(detailSegment).toContain('Top\n\n\nMiddle');
    expect(detailSegment).toContain('Middle\n\n\nBottom');
  });

  it('should archive selected email from list view with e key', async () => {
    const modify = vi.fn().mockResolvedValue(undefined);

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: { modify, trash: vi.fn() } } }),
      listInboxEmails: async () => [
        createEmail({
          message_id: 'msg-1',
          subject: 'First',
          sender: 'first@example.com',
          received_at: Date.parse('2026-02-08T10:00:00Z')
        })
      ],
      navigationInputs: ['e', 'quit'],
      writeLine: () => undefined
    });

    expect(status).toBe(0);
    expect(modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg-1',
      removeLabelIds: ['INBOX']
    });
  });

  it('should delete selected email from detail view with # key', async () => {
    const trash = vi.fn().mockResolvedValue(undefined);

    const status = await runInboxCli(['--interactive'], {
      loadConfig: () => baseConfig,
      readAuthTokens: async () => ({ refreshToken: 'refresh' }),
      createGmailClient: () => ({ users: { messages: { modify: vi.fn(), trash } } }),
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
      navigationInputs: ['enter', '#', 'quit'],
      writeLine: () => undefined
    });

    expect(status).toBe(0);
    expect(trash).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg-1'
    });
  });

  it('should toggle from full detail to summary and back to full with s key', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-keys-'));
    tempDirs.push(dir);
    const lines: string[] = [];
    const summarizeEmail = vi.fn().mockResolvedValue({
      summarySentence: 'The sender asks for a confirmation.',
      actionItems: ['Reply today']
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
        body: 'Please confirm today',
        headers: { subject: 'First' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 's', 's', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(summarizeEmail).toHaveBeenCalledTimes(1);
    const output = lines.join('\n');
    expect(output).toContain('AI Summary');
    expect(output).toContain('- Reply today');
    expect(output).toContain('Detail View');
  });

  it('should keep full detail visible and allow retry after summary failure', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-keys-'));
    tempDirs.push(dir);
    const lines: string[] = [];
    const summarizeEmail = vi
      .fn()
      .mockRejectedValueOnce(new Error('provider offline'))
      .mockResolvedValueOnce({
        summarySentence: 'Retry succeeded.',
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
      createSummaryStore: () => createSummaryStore(join(dir, 'email-summaries.json')),
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
        body: 'Please confirm today',
        headers: { subject: 'First' },
        labels: ['INBOX'],
        is_read: true
      }),
      navigationInputs: ['enter', 's', 's', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(summarizeEmail).toHaveBeenCalledTimes(2);
    const output = lines.join('\n');
    expect(output).toContain('(error)');
    expect(output).toContain('Detail View');
    expect(output).toContain('Retry succeeded.');
  });

  it('should show detail help text including summary toggle key', async () => {
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
      navigationInputs: ['enter', 'quit'],
      writeLine: (line) => lines.push(line)
    });

    expect(status).toBe(0);
    expect(lines.join('\n')).toContain('Keys: s toggles summary/full, b or Esc returns to list');
  });
});
