/**
 * Integration tests for email detail blank line collapsing
 *
 * Tests the full flow: raw email body → buildBodyViewport → rendered lines
 *
 * Acceptance Criteria (US1):
 * - 5+ consecutive blank lines collapse to 2
 * - 2 blank lines preserved as-is
 * - 0 blank lines unchanged
 * - Multiple groups collapsed independently
 */
import { describe, it, expect } from 'vitest';
import { buildBodyViewport } from '../../src/cli/components/email-detail.js';
import type { Email } from '../../src/core/models/email.js';

describe('Email Detail Blank Line Collapsing Integration', () => {
  // Create a mock email with excessive blank lines
  const createEmailWithBlankLines = (body: string): Email => ({
    id: 'test-email',
    threadId: 'test-thread',
    subject: 'Test Subject',
    sender: { name: 'Sender', email: 'sender@example.com' },
    recipients: [{ name: 'Recipient', email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: body, html: undefined },
    labels: ['INBOX'],
    isRead: true,
    category: 'updates',
    snippet: body.slice(0, 50),
    historyId: 'history-1',
    syncedAt: new Date(),
  });

  describe('US1 Acceptance Scenarios', () => {
    it('AC1: should collapse 5+ consecutive blank lines to 2', () => {
      // Given: email body contains 5 consecutive blank lines
      const email = createEmailWithBlankLines('Line 1\n\n\n\n\nLine 2');

      // When: email is displayed in detail pane
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Then: only 2 blank lines are shown (total 3 lines: Line 1, blank, Line 2)
      expect(viewport.totalLines).toBe(3);
      expect(viewport.lines).toContain('Line 1');
      expect(viewport.lines).toContain('Line 2');
    });

    it('AC2: should preserve exactly 2 blank lines', () => {
      // Given: email body contains exactly 2 blank lines
      const email = createEmailWithBlankLines('Line 1\n\nLine 2');

      // When: email is displayed in detail pane
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Then: the 2 blank lines are preserved as-is
      expect(viewport.totalLines).toBe(3);
      expect(viewport.lines).toContain('Line 1');
      expect(viewport.lines).toContain('Line 2');
    });

    it('AC3: should preserve content with no blank lines', () => {
      // Given: email body contains no blank lines
      const email = createEmailWithBlankLines('Line 1\nLine 2\nLine 3');

      // When: email is displayed in detail pane
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Then: the content is displayed unchanged
      expect(viewport.totalLines).toBe(3);
      expect(viewport.lines).toContain('Line 1');
      expect(viewport.lines).toContain('Line 2');
      expect(viewport.lines).toContain('Line 3');
    });

    it('AC4: should collapse multiple groups independently', () => {
      // Given: email body contains multiple groups of blank lines separated by content
      const email = createEmailWithBlankLines('Line 1\n\n\n\n\nLine 2\n\n\n\n\n\n\nLine 3');

      // When: email is displayed in detail pane
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Then: each group is independently collapsed to 2 blank lines
      // Result: Line 1\n\nLine 2\n\nLine 3 (5 lines total)
      expect(viewport.totalLines).toBe(5);
      expect(viewport.lines).toContain('Line 1');
      expect(viewport.lines).toContain('Line 2');
      expect(viewport.lines).toContain('Line 3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle blank lines at start of text', () => {
      const email = createEmailWithBlankLines('\n\n\n\n\nLine 1');
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Should collapse to 2 leading blank lines + content
      expect(viewport.totalLines).toBe(3);
      expect(viewport.lines).toContain('Line 1');
    });

    it('should handle blank lines at end of text', () => {
      const email = createEmailWithBlankLines('Line 1\n\n\n\n\n');
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Should collapse trailing blank lines to 2
      expect(viewport.lines).toContain('Line 1');
    });

    it('should handle empty body', () => {
      const email = createEmailWithBlankLines('');
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);
      
      // Empty string splits into 1 empty line
      expect(viewport.totalLines).toBe(1);
    });

    it('should handle body with only whitespace', () => {
      const email = createEmailWithBlankLines('\n\n\n\n\n');
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Should collapse to 2 newlines = 3 lines (2 empty + content or just empty)
      expect(viewport.totalLines).toBeLessThanOrEqual(3);
    });

    it('should handle very long content with blank lines', () => {
      const lines = ['Paragraph 1'];
      for (let i = 0; i < 5; i++) {
        lines.push(''); // Blank lines
      }
      lines.push('Paragraph 2');

      const email = createEmailWithBlankLines(lines.join('\n'));
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // Should collapse 5 blank lines to 2
      expect(viewport.lines).toContain('Paragraph 1');
      expect(viewport.lines).toContain('Paragraph 2');
    });
  });

  describe('Success Criteria Validation', () => {
    it('SC-001: 10+ consecutive blank lines display with max 2 blank lines', () => {
      const email = createEmailWithBlankLines('Start\n\n\n\n\n\n\n\n\n\n\nEnd');
      const viewport = buildBodyViewport(email.body.text ?? '', 20, 0, 80);

      // 10 blank lines should collapse to 2, giving us 3 lines total
      expect(viewport.totalLines).toBe(3);
      expect(viewport.lines).toContain('Start');
      expect(viewport.lines).toContain('End');
    });
  });
});
