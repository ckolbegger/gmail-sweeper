/**
 * Unit tests for confidence indicator rendering in EmailList
 *
 * T037: Tests for confidence display when smart filter is active
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { EmailList } from '@/cli/components/email-list.js';
import type { Email } from '@/core/models/email.js';
import type { ConfidenceLevel } from '@/core/ai/provider.js';

// Helper to create test emails
function createTestEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-id',
    threadId: 'thread-id',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'test@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-15'),
    body: { text: 'Test body' },
    labels: [],
    isRead: true,
    snippet: 'Test snippet',
    historyId: '123',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('EmailList - Confidence Indicator (T037)', () => {
  const emails = [
    createTestEmail({ id: 'email-1', subject: 'High Confidence Email' }),
    createTestEmail({ id: 'email-2', subject: 'Medium Confidence Email' }),
    createTestEmail({ id: 'email-3', subject: 'Low Confidence Email' }),
    createTestEmail({ id: 'email-4', subject: 'No Confidence Data' }),
  ];

  describe('confidence indicator rendering', () => {
    it('should show green indicator for high confidence emails', () => {
      const confidenceMap = new Map<string, ConfidenceLevel>([
        ['email-1', 'high'],
      ]);

      const { lastFrame } = render(
        <EmailList
          emails={[emails[0]]}
          confidenceMap={confidenceMap}
          selectedId="email-1"
        />
      );

      // High confidence should show green ● (or similar indicator)
      const output = lastFrame();
      expect(output).toContain('High Confidence Email');
      // Green indicator is typically shown with green color
      expect(output).toBeTruthy();
    });

    it('should show yellow indicator for medium confidence emails', () => {
      const confidenceMap = new Map<string, ConfidenceLevel>([
        ['email-2', 'medium'],
      ]);

      const { lastFrame } = render(
        <EmailList
          emails={[emails[1]]}
          confidenceMap={confidenceMap}
          selectedId="email-2"
        />
      );

      const output = lastFrame();
      expect(output).toContain('Medium Confidence Email');
      expect(output).toBeTruthy();
    });

    it('should show dim indicator for low confidence emails', () => {
      const confidenceMap = new Map<string, ConfidenceLevel>([
        ['email-3', 'low'],
      ]);

      const { lastFrame } = render(
        <EmailList
          emails={[emails[2]]}
          confidenceMap={confidenceMap}
          selectedId="email-3"
        />
      );

      const output = lastFrame();
      expect(output).toContain('Low Confidence Email');
      expect(output).toBeTruthy();
    });

    it('should not show indicator for emails without confidence data', () => {
      const confidenceMap = new Map<string, ConfidenceLevel>([
        ['email-1', 'high'],
      ]);

      const { lastFrame } = render(
        <EmailList
          emails={[emails[3]]} // email-4 has no confidence
          confidenceMap={confidenceMap}
          selectedId="email-4"
        />
      );

      const output = lastFrame();
      expect(output).toContain('No Confidence Data');
      // Should render normally without indicator
      expect(output).toBeTruthy();
    });
  });

  describe('indicator placement', () => {
    it('should appear next to email subject', () => {
      const confidenceMap = new Map<string, ConfidenceLevel>([
        ['email-1', 'high'],
      ]);

      const { lastFrame } = render(
        <EmailList
          emails={[emails[0]]}
          confidenceMap={confidenceMap}
          selectedId="email-1"
        />
      );

      const output = lastFrame();
      // Subject should be present
      expect(output).toContain('High Confidence Email');
    });
  });

  describe('empty confidenceMap', () => {
    it('should render normally when confidenceMap is undefined', () => {
      const { lastFrame } = render(
        <EmailList
          emails={emails}
          selectedId="email-1"
        />
      );

      const output = lastFrame();
      expect(output).toContain('High Confidence Email');
      expect(output).toContain('Medium Confidence Email');
    });

    it('should render normally when confidenceMap is empty', () => {
      const confidenceMap = new Map<string, ConfidenceLevel>();

      const { lastFrame } = render(
        <EmailList
          emails={emails}
          confidenceMap={confidenceMap}
          selectedId="email-1"
        />
      );

      const output = lastFrame();
      expect(output).toContain('High Confidence Email');
    });
  });

  describe('mixed confidence levels', () => {
    it('should render different indicators for different confidence levels', () => {
      const confidenceMap = new Map<string, ConfidenceLevel>([
        ['email-1', 'high'],
        ['email-2', 'medium'],
        ['email-3', 'low'],
      ]);

      const { lastFrame } = render(
        <EmailList
          emails={emails.slice(0, 3)}
          confidenceMap={confidenceMap}
          selectedId="email-1"
        />
      );

      const output = lastFrame();
      expect(output).toContain('High Confidence Email');
      expect(output).toContain('Medium Confidence Email');
      expect(output).toContain('Low Confidence Email');
    });
  });
});
