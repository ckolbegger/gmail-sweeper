/**
 * T002: Unit tests for useGmail state mutation helpers (removeEmail, restoreEmail).
 * Pure logic tests — no React rendering needed.
 */

import { describe, it, expect } from 'vitest';
import type { Email } from '../../../src/core/models/index.js';

function makeEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email ${id}`,
    sender: { email: `sender${id}@test.com`, name: `Sender ${id}` },
    recipients: [],
    date: new Date('2026-01-01'),
    snippet: `Snippet ${id}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

// Import the pure helper functions (to be exported from useGmail.ts)
import { removeEmailFromList, restoreEmailToList } from '../../../src/tui/hooks/useGmail.js';

describe('useGmail state mutations (T002)', () => {
  describe('removeEmailFromList', () => {
    it('removes an email by id', () => {
      const emails = [makeEmail('a'), makeEmail('b'), makeEmail('c')];
      const result = removeEmailFromList(emails, 'b');
      expect(result.map(e => e.id)).toEqual(['a', 'c']);
    });

    it('is a no-op if id not found', () => {
      const emails = [makeEmail('a'), makeEmail('b')];
      const result = removeEmailFromList(emails, 'z');
      expect(result.map(e => e.id)).toEqual(['a', 'b']);
    });
  });

  describe('restoreEmailToList', () => {
    it('inserts email at the given index', () => {
      const emails = [makeEmail('a'), makeEmail('c')];
      const result = restoreEmailToList(emails, makeEmail('b'), 1);
      expect(result.map(e => e.id)).toEqual(['a', 'b', 'c']);
    });

    it('clamps negative index to 0', () => {
      const emails = [makeEmail('a')];
      const result = restoreEmailToList(emails, makeEmail('z'), -5);
      expect(result[0]!.id).toBe('z');
    });

    it('clamps out-of-bounds index to end', () => {
      const emails = [makeEmail('a')];
      const result = restoreEmailToList(emails, makeEmail('z'), 100);
      expect(result[result.length - 1]!.id).toBe('z');
    });
  });
});
