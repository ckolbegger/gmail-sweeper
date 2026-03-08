/**
 * Unit tests for email action handlers
 * Feature: 004-glm-email-action-keys
 */

import { describe, it, expect } from 'vitest';

import {
  calculateNextSelection,
  toEmailActionResult,
} from '../../../specs/004-glm-email-action-keys/contracts/email-actions.js';
import type { Email } from '../../../src/core/models/email.js';
import type { BatchActionResult } from '../../../src/core/contracts/gmail-api.js';

// Helper to create mock emails
function createMockEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-id',
    threadId: 'thread-id',
    from: { name: 'Test Sender', email: 'test@example.com' },
    to: [{ name: 'Recipient', email: 'recipient@example.com' }],
    subject: 'Test Subject',
    date: new Date('2024-01-01'),
    snippet: 'Test snippet',
    body: 'Test body',
    labels: ['INBOX'],
    isRead: false,
    ...overrides,
  };
}

describe('email actions', () => {
  describe('calculateNextSelection', () => {
    it('selects next email when middle email is removed', () => {
      const emails = [
        createMockEmail({ id: 'email-1' }),
        createMockEmail({ id: 'email-2' }),
        createMockEmail({ id: 'email-3' }),
      ];

      const result = calculateNextSelection(emails, 'email-2', 'email-2');

      expect(result.changed).toBe(true);
      expect(result.selectedId).toBe('email-3');
    });

    it('selects previous email when last email is removed', () => {
      const emails = [
        createMockEmail({ id: 'email-1' }),
        createMockEmail({ id: 'email-2' }),
        createMockEmail({ id: 'email-3' }),
      ];

      const result = calculateNextSelection(emails, 'email-3', 'email-3');

      expect(result.changed).toBe(true);
      expect(result.selectedId).toBe('email-2');
    });

    it('returns undefined when only email is removed', () => {
      const emails: Email[] = [];

      const result = calculateNextSelection(emails, 'email-1', 'email-1');

      expect(result.changed).toBe(true);
      expect(result.selectedId).toBeUndefined();
    });

    it('selects new first email when first email is removed', () => {
      const emails = [
        createMockEmail({ id: 'email-1' }),
        createMockEmail({ id: 'email-2' }),
        createMockEmail({ id: 'email-3' }),
      ];

      const result = calculateNextSelection(emails, 'email-1', 'email-1');

      expect(result.changed).toBe(true);
      expect(result.selectedId).toBe('email-2');
    });

    it('keeps selection if removed email was not selected', () => {
      const emails = [
        createMockEmail({ id: 'email-1' }),
        createMockEmail({ id: 'email-2' }),
        createMockEmail({ id: 'email-3' }),
      ];

      const result = calculateNextSelection(emails, 'email-1', 'email-2');

      expect(result.changed).toBe(false);
      expect(result.selectedId).toBe('email-2');
    });
  });

  describe('toEmailActionResult', () => {
    it('returns success result when batch succeeds', () => {
      const batchResult: BatchActionResult = {
        success: true,
        successfulCount: 1,
        failedCount: 0,
        failures: [],
      };

      const result = toEmailActionResult(batchResult, 'email-1', 'archive');

      expect(result.success).toBe(true);
      expect(result.emailId).toBe('email-1');
      expect(result.action).toBe('archive');
      expect(result.error).toBeUndefined();
    });

    it('returns failure result when batch fails', () => {
      const batchResult: BatchActionResult = {
        success: false,
        successfulCount: 0,
        failedCount: 1,
        failures: [{ emailId: 'email-1', error: 'API error' }],
      };

      const result = toEmailActionResult(batchResult, 'email-1', 'delete');

      expect(result.success).toBe(false);
      expect(result.emailId).toBe('email-1');
      expect(result.action).toBe('delete');
      expect(result.error).toBe('API error');
    });

    it('returns unknown error when failure not found', () => {
      const batchResult: BatchActionResult = {
        success: false,
        successfulCount: 0,
        failedCount: 1,
        failures: [{ emailId: 'other-email', error: 'Other error' }],
      };

      const result = toEmailActionResult(batchResult, 'email-1', 'archive');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });
});

describe('HELP_SECTIONS actions', () => {
  it('should include Actions section with archive and delete commands', async () => {
    const { HELP_SECTIONS } = await import('../../../src/cli/help.js');

    const actionsSection = HELP_SECTIONS.find((section) => section.title === 'Actions');

    expect(actionsSection).toBeDefined();
    expect(actionsSection?.commands).toBeDefined();

    const keys = actionsSection?.commands.map((cmd) => cmd.key) ?? [];
    expect(keys).toContain('e');
    expect(keys).toContain('#');

    const archiveCmd = actionsSection?.commands.find((cmd) => cmd.key === 'e');
    const deleteCmd = actionsSection?.commands.find((cmd) => cmd.key === '#');

    expect(archiveCmd?.description).toContain('Archive');
    expect(deleteCmd?.description).toContain('Delete');
  });
});
