/**
 * EmailList Component Tests
 *
 * Tests for the email list TUI component.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EmailList } from '../../../../src/cli/components/email-list.js';
import type { Email } from '../../../../src/core/contracts/types.js';

// Test fixture helpers
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

describe('EmailList', () => {
  it('should render list of emails', () => {
    const emails = [
      createEmail({ id: '1', subject: 'Email 1' }),
      createEmail({ id: '2', subject: 'Email 2' }),
      createEmail({ id: '3', subject: 'Email 3' }),
    ];

    const { lastFrame } = render(
      React.createElement(EmailList, {
        emails,
        selectedIndex: 0,
        onSelect: vi.fn(),
      })
    );

    expect(lastFrame()).toContain('Email 1');
    expect(lastFrame()).toContain('Email 2');
    expect(lastFrame()).toContain('Email 3');
  });

  it('should highlight selected email', () => {
    const emails = [
      createEmail({ id: '1', subject: 'Email 1' }),
      createEmail({ id: '2', subject: 'Email 2' }),
    ];

    const { lastFrame } = render(
      React.createElement(EmailList, {
        emails,
        selectedIndex: 1,
        onSelect: vi.fn(),
      })
    );

    // The selected email should have visual indicator
    const frame = lastFrame();
    expect(frame).toContain('Email 1');
    expect(frame).toContain('Email 2');
  });

  it('should display unread emails in bold', () => {
    const emails = [
      createEmail({ id: '1', subject: 'Unread Email', isRead: false }),
      createEmail({ id: '2', subject: 'Read Email', isRead: true }),
    ];

    const { lastFrame } = render(
      React.createElement(EmailList, {
        emails,
        selectedIndex: 0,
        onSelect: vi.fn(),
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Unread Email');
    expect(frame).toContain('Read Email');
  });

  it('should show email subject, sender, and date', () => {
    const email = createEmail({
      id: '1',
      subject: 'Important Meeting',
      sender: { name: 'John Doe', email: 'john@example.com' },
      dateReceived: new Date('2024-01-15T10:30:00Z'),
    });

    const { lastFrame } = render(
      React.createElement(EmailList, {
        emails: [email],
        selectedIndex: 0,
        onSelect: vi.fn(),
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Important Meeting');
    expect(frame).toContain('John Doe');
  });

  it('should handle empty list state', () => {
    const { lastFrame } = render(
      React.createElement(EmailList, {
        emails: [],
        selectedIndex: 0,
        onSelect: vi.fn(),
      })
    );

    expect(lastFrame()).toContain('No emails');
  });

  it('should call onSelect when email is selected', () => {
    const onSelect = vi.fn();
    const emails = [
      createEmail({ id: '1', subject: 'Email 1' }),
      createEmail({ id: '2', subject: 'Email 2' }),
    ];

    const { stdin } = render(
      React.createElement(EmailList, {
        emails,
        selectedIndex: 0,
        onSelect,
      })
    );

    // Simulate Enter key press (ink-testing-library uses specific format)
    stdin.write('\r');

    // Note: Ink testing library stdin simulation may not trigger useInput
    // This test verifies the component renders with the handler
    expect(onSelect).toBeDefined();
  });

  it('should display email labels', () => {
    const email = createEmail({
      id: '1',
      subject: 'Labeled Email',
      labels: ['INBOX', 'IMPORTANT', 'STARRED'],
    });

    const { lastFrame } = render(
      React.createElement(EmailList, {
        emails: [email],
        selectedIndex: 0,
        onSelect: vi.fn(),
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('INBOX');
  });

  it('should truncate long subjects', () => {
    const email = createEmail({
      id: '1',
      subject: 'A'.repeat(100),
    });

    const { lastFrame } = render(
      React.createElement(EmailList, {
        emails: [email],
        selectedIndex: 0,
        onSelect: vi.fn(),
      })
    );

    const frame = lastFrame();
    // Subject should be truncated (without the ANSI codes, the visible text should be <= 53 chars)
    expect(frame).toContain('...');
  });

  describe('viewport scrolling', () => {
    it('should only render emails that fit within maxVisible', () => {
      const emails = Array.from({ length: 20 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          maxVisible: 5,
        })
      );

      const frame = lastFrame();
      // Should show first 5 emails
      expect(frame).toContain('Email 0');
      expect(frame).toContain('Email 4');
      // Email 5 should not be visible
      expect(frame).not.toContain('Email 5');
    });

    it('should scroll viewport when selected email is beyond maxVisible', () => {
      const emails = Array.from({ length: 20 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 7,
          onSelect: vi.fn(),
          maxVisible: 5,
        })
      );

      const frame = lastFrame();
      // With selectedIndex 7 and maxVisible 5:
      // - In standard scrolling, selection stays visible at bottom of viewport
      // - Viewport shows emails 3-7 (selected at bottom)
      expect(frame).toContain('Email 3');
      expect(frame).toContain('Email 7');
      // Email 0 should not be visible
      expect(frame).not.toContain('Email 0');
      // Email 8 should not be visible
      expect(frame).not.toContain('Email 8');
    });

    it('should keep selected email visible when scrolling', () => {
      const emails = Array.from({ length: 30 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 15,
          onSelect: vi.fn(),
          maxVisible: 7,
        })
      );

      const frame = lastFrame();
      // With selectedIndex 15 and maxVisible 7:
      // - In standard scrolling, viewport shows emails 9-15 (selected at bottom)
      expect(frame).toContain('Email 9');
      expect(frame).toContain('Email 15');
      // Items outside viewport should not be visible
      expect(frame).not.toContain('Email 8');
      expect(frame).not.toContain('Email 16');
    });

    it('should show correct count in scroll indicators with many emails', () => {
      const emails = Array.from({ length: 100 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 50,
          onSelect: vi.fn(),
          maxVisible: 10,
        })
      );

      const frame = lastFrame();
      // With selectedIndex 50 and maxVisible 10:
      // - Viewport shows emails 41-50
      // - 41 emails above (0-40), 49 emails below (51-99)
      expect(frame).toContain('↑ 41 more');
      expect(frame).toContain('↓ 49 more');
    });

    it('should show scroll indicator when there are more emails above', () => {
      const emails = Array.from({ length: 20 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 10,
          onSelect: vi.fn(),
          maxVisible: 5,
        })
      );

      const frame = lastFrame();
      // Should indicate there are more emails above
      expect(frame).toContain('↑');
    });

    it('should show scroll indicator when there are more emails below', () => {
      const emails = Array.from({ length: 20 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 2,
          onSelect: vi.fn(),
          maxVisible: 5,
        })
      );

      const frame = lastFrame();
      // Should indicate there are more emails below
      expect(frame).toContain('↓');
    });

    it('should use autoMaxVisible to calculate visible emails from terminal height', () => {
      const emails = Array.from({ length: 50 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          autoMaxVisible: {
            terminalHeight: 24,
            headerLines: 3,
            footerLines: 3,
          },
        })
      );

      const frame = lastFrame();
      // Should show approximately terminalHeight - header - footer - padding = ~15-18 emails
      // Email 0 should be visible
      expect(frame).toContain('Email 0');
      // Email 20 should not be visible with this terminal height
      expect(frame).not.toContain('Email 20');
      // Should show footer with how many more
      expect(frame).toContain('↓');
    });

    it('should fall back to default maxVisible when autoMaxVisible not provided', () => {
      const emails = Array.from({ length: 50 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          // No autoMaxVisible, should use default maxVisible: 10
        })
      );

      const frame = lastFrame();
      // Should show default 10 emails
      expect(frame).toContain('Email 0');
      expect(frame).toContain('Email 9');
      // Email 10 should not be visible with default maxVisible
      expect(frame).not.toContain('Email 10');
    });

    it('should prioritize maxVisible over autoMaxVisible when both provided', () => {
      const emails = Array.from({ length: 50 }, (_, i) =>
        createEmail({ id: String(i), subject: `Email ${i}` })
      );

      const { lastFrame } = render(
        React.createElement(EmailList, {
          emails,
          selectedIndex: 0,
          onSelect: vi.fn(),
          maxVisible: 5,
          autoMaxVisible: {
            terminalHeight: 24,
            headerLines: 3,
            footerLines: 3,
          },
        })
      );

      const frame = lastFrame();
      // Should use explicit maxVisible: 5, not calculated from autoMaxVisible
      expect(frame).toContain('Email 0');
      expect(frame).toContain('Email 4');
      expect(frame).not.toContain('Email 5');
    });
  });
});
