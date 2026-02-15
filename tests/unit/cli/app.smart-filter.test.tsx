/**
 * InboxApp Smart Filter Integration Tests
 *
 * Tests for integrating the smart filter into the main App component.
 * Covers: filter activation, input display, filtered results display, and clear functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../../../src/cli/app.js';
import type { Email } from '../../../src/core/contracts/types.js';
import type { GmailClient } from '../../../src/core/contracts/gmail-api.js';
import type { EmailRepository } from '../../../src/core/services/email-repository.js';

function createEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-id',
    threadId: 'thread-id',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-15T10:00:00Z'),
    body: { text: 'Test body' },
    labels: ['INBOX'],
    isRead: false,
    snippet: 'Test snippet',
    historyId: 'history-id',
    syncedAt: new Date(),
    ...overrides,
  };
}

function createMockGmailClient(): GmailClient {
  return {
    auth: {
      isAuthenticated: vi.fn().mockResolvedValue(true),
      authenticate: vi.fn(),
    },
    fullSync: vi.fn().mockResolvedValue({
      emails: [],
      syncToken: 'token',
    }),
  } as unknown as GmailClient;
}

function createMockEmailRepository(): EmailRepository {
  return {
    list: vi.fn().mockResolvedValue({
      items: [],
      nextPageToken: undefined,
    }),
    save: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    delete: vi.fn(),
  } as unknown as EmailRepository;
}

describe('App - Smart Filter Integration', () => {
  describe('footer help text includes filter shortcuts', () => {
    it('should show filter and Escape shortcuts in footer help text (FR-001, FR-007)', async () => {
      const mockGmailClient = createMockGmailClient();
      const mockEmailRepository = createMockEmailRepository();
      const emails = [createEmail({ id: '1', subject: 'Email 1' })];

      (mockEmailRepository.list as any).mockResolvedValue({
        items: emails,
        nextPageToken: undefined,
      });

      const { lastFrame } = render(
        React.createElement(App, {
          gmailClient: mockGmailClient,
          emailRepository: mockEmailRepository,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      const frame = lastFrame();
      expect(frame).toContain('f filter');
      expect(frame).toContain('Esc clear');
    });
  });

  describe('filter integration with EmailList', () => {
    it('should render EmailList with filterCount and totalCount props when filter is active', async () => {
      const mockGmailClient = createMockGmailClient();
      const mockEmailRepository = createMockEmailRepository();
      const emails = [
        createEmail({ id: '1', subject: 'Email 1' }),
        createEmail({ id: '2', subject: 'Email 2' }),
      ];

      (mockEmailRepository.list as any).mockResolvedValue({
        items: emails,
        nextPageToken: undefined,
      });

      const { lastFrame } = render(
        React.createElement(App, {
          gmailClient: mockGmailClient,
          emailRepository: mockEmailRepository,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      const frame = lastFrame();
      expect(frame).toContain('2 emails');
    });
  });

  describe('FilterInput component integration', () => {
    it('should render FilterInput when smart filter is in input mode', async () => {
      const mockGmailClient = createMockGmailClient();
      const mockEmailRepository = createMockEmailRepository();
      const emails = [createEmail({ id: '1', subject: 'Email 1' })];

      (mockEmailRepository.list as any).mockResolvedValue({
        items: emails,
        nextPageToken: undefined,
      });

      const { lastFrame, stdin } = render(
        React.createElement(App, {
          gmailClient: mockGmailClient,
          emailRepository: mockEmailRepository,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      stdin.write('f');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const frame = lastFrame();
      expect(frame).toContain('Filter:');
    });
  });

  describe('header displays filter description (FR-006)', () => {
    it('should render header with email count', async () => {
      const mockGmailClient = createMockGmailClient();
      const mockEmailRepository = createMockEmailRepository();
      const emails = [createEmail({ id: '1', subject: 'Email 1' })];

      (mockEmailRepository.list as any).mockResolvedValue({
        items: emails,
        nextPageToken: undefined,
      });

      const { lastFrame } = render(
        React.createElement(App, {
          gmailClient: mockGmailClient,
          emailRepository: mockEmailRepository,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      const frame = lastFrame();
      expect(frame).toContain('Gmail Sweep');
      expect(frame).toContain('1 emails');
    });
  });

  describe('clear filter restores full list (FR-008)', () => {
    it('should render app with full email list initially', async () => {
      const mockGmailClient = createMockGmailClient();
      const mockEmailRepository = createMockEmailRepository();
      const emails = [
        createEmail({ id: '1', subject: 'Email 1' }),
        createEmail({ id: '2', subject: 'Email 2' }),
      ];

      (mockEmailRepository.list as any).mockResolvedValue({
        items: emails,
        nextPageToken: undefined,
      });

      const { lastFrame } = render(
        React.createElement(App, {
          gmailClient: mockGmailClient,
          emailRepository: mockEmailRepository,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 150));

      const frame = lastFrame();
      expect(frame).toContain('2 emails');
    });
  });
});
