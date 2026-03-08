/**
 * Regression tests for B001: Summary view state reset on email change
 *
 * Bug: When navigating to a new email after viewing summary of a previous email,
 * the detail pane continued showing the summary of the prior email instead of
 * switching to full email view for the newly selected email.
 *
 * Fix: Added useEffect hook to reset summary state when email?.id changes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { EmailDetail } from '../../../src/cli/components/email-detail.js';
import { useKeyboard } from '../../../src/cli/hooks/use-keyboard.js';
import type { Email } from '../../../src/core/models/email.js';
import { SummaryService, type EmailSummary } from '../../../src/core/services/summary-service.js';

// Mock the AI config to prevent actual API calls
vi.mock('../../../src/core/ai/config.js', () => ({
  resolveAiConfig: () => ({
    provider: 'anthropic',
    apiKey: 'test-key',
    baseUrl: undefined,
    maxContextTokens: 32000,
  }),
}));

// Mock the AI provider to prevent actual API calls
vi.mock('../../../src/core/ai/provider.js', () => ({
  createAiProvider: () => ({
    classifyEmails: vi.fn(),
    callLLM: vi.fn().mockResolvedValue(
      JSON.stringify({
        summary: 'Test summary',
        actionItems: ['Action 1'],
      })
    ),
  }),
}));

// Mock keyboard hook
vi.mock('../../../src/cli/hooks/use-keyboard.js', () => ({
  useKeyboard: vi.fn(),
}));

// Mock clipboard service
vi.mock('../../../src/core/services/clipboard-service.js', () => ({
  ClipboardService: {
    write: vi.fn().mockResolvedValue(true),
  },
}));

// Mock browser service
vi.mock('../../../src/core/services/browser-service.js', () => ({
  BrowserService: {
    open: vi.fn().mockResolvedValue(true),
  },
}));

describe('B001: Summary view state reset on email change', () => {
  const useKeyboardMock = vi.mocked(useKeyboard);

  const createTestEmail = (id: string, subject: string, summary?: string): Email => ({
    id,
    threadId: `thread-${id}`,
    subject,
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ name: 'Test Recipient', email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-01T10:00:00Z'),
    body: { text: `Body text for ${subject}`, html: undefined },
    labels: ['INBOX'],
    isRead: false,
    category: 'updates',
    snippet: `Snippet for ${subject}`,
    historyId: `history-${id}`,
    syncedAt: new Date(),
    summary,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show full email view by default for new email', () => {
    const email = createTestEmail('email-1', 'Test Email 1');
    const { lastFrame } = render(<EmailDetail email={email} />);

    // Should show "From:" header (full email view), not "Summary:" label
    expect(lastFrame()).toContain('From:');
    expect(lastFrame()).not.toContain('Summary:');
  });

  it('should reset to full email view when email changes', () => {
    const email1 = createTestEmail('email-1', 'Test Email 1');
    const email2 = createTestEmail('email-2', 'Test Email 2');

    // Initial render with email 1
    const { lastFrame, rerender } = render(<EmailDetail email={email1} />);
    expect(lastFrame()).toContain('Test Email 1');

    // Simulate navigation to email 2
    rerender(<EmailDetail email={email2} />);

    // Should show email 2's full view (From: header), not email 1's summary
    expect(lastFrame()).toContain('Test Email 2');
    expect(lastFrame()).toContain('From:');
    expect(lastFrame()).not.toContain('Summary:');
  });

  it('should show full email view even if previous email had cached summary', () => {
    const email1WithSummary = createTestEmail(
      'email-1',
      'Test Email 1',
      JSON.stringify({ summary: 'Email 1 summary', actionItems: [] })
    );
    const email2 = createTestEmail('email-2', 'Test Email 2');

    // Initial render with email 1 (which has a cached summary)
    const { lastFrame, rerender } = render(<EmailDetail email={email1WithSummary} />);
    expect(lastFrame()).toContain('Test Email 1');

    // Navigate to email 2
    rerender(<EmailDetail email={email2} />);

    // Should show email 2's full view, NOT email 1's summary
    expect(lastFrame()).toContain('Test Email 2');
    expect(lastFrame()).toContain('From:');
    expect(lastFrame()).not.toContain('Email 1 summary');
  });

  it('should handle null email transition gracefully', () => {
    const email1 = createTestEmail('email-1', 'Test Email 1');

    // Start with email
    const { lastFrame, rerender } = render(<EmailDetail email={email1} />);
    expect(lastFrame()).toContain('Test Email 1');

    // Transition to null (no email selected)
    rerender(<EmailDetail email={null} />);
    expect(lastFrame()).toContain('Select an email');

    // Transition back to a different email
    const email2 = createTestEmail('email-2', 'Test Email 2');
    rerender(<EmailDetail email={email2} />);
    expect(lastFrame()).toContain('Test Email 2');
    expect(lastFrame()).toContain('From:');
    expect(lastFrame()).not.toContain('Summary:');
  });

  it('should ignore stale summary generation when email changes before completion', async () => {
    const emailA = createTestEmail('email-a', 'Email A');
    const emailB = createTestEmail('email-b', 'Email B');

    let resolveSummary!: (summary: EmailSummary) => void;
    const pendingSummary = new Promise<EmailSummary>((resolve) => {
      resolveSummary = resolve;
    });

    const generateSummarySpy = vi
      .spyOn(SummaryService.prototype, 'generateSummary')
      .mockReturnValue(pendingSummary);

    const getSummaryShortcut = () => {
      const latestCall = useKeyboardMock.mock.calls[useKeyboardMock.mock.calls.length - 1];
      const shortcuts = latestCall?.[0]?.shortcuts ?? [];
      return shortcuts.find((shortcut) => shortcut.key.toLowerCase() === 's');
    };

    const flushEffects = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    };

    const { lastFrame, rerender } = render(<EmailDetail email={emailA} />);
    await flushEffects();

    const summaryShortcut = getSummaryShortcut();
    expect(summaryShortcut).toBeDefined();
    summaryShortcut?.handler();

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Generating summary...');
    });

    rerender(<EmailDetail email={emailB} />);
    await flushEffects();

    resolveSummary({ summary: 'Email A generated summary', actionItems: [] });
    await flushEffects();

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Email B');
      expect(lastFrame()).toContain('From:');
      expect(lastFrame()).not.toContain('Summary:');
      expect(lastFrame()).not.toContain('Email A generated summary');
    });

    expect(generateSummarySpy).toHaveBeenCalledTimes(1);
    generateSummarySpy.mockRestore();
  });

  it('should handle complete keyboard flow: press s on Email A, navigate to Email B, press s on Email B', async () => {
    const email1WithSummary = createTestEmail(
      'email-1',
      'Test Email 1',
      JSON.stringify({ summary: 'Email A summary', actionItems: [] })
    );
    const email2WithSummary = createTestEmail(
      'email-2',
      'Test Email 2',
      JSON.stringify({ summary: 'Email B summary', actionItems: [] })
    );

    const getSummaryShortcut = () => {
      const latestCall = useKeyboardMock.mock.calls[useKeyboardMock.mock.calls.length - 1];
      const shortcuts = latestCall?.[0]?.shortcuts ?? [];
      return shortcuts.find((shortcut) => shortcut.key.toLowerCase() === 's');
    };

    const flushEffects = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    };

    const { lastFrame, rerender } = render(<EmailDetail email={email1WithSummary} />);
    await flushEffects();

    const summaryShortcutA = getSummaryShortcut();
    expect(summaryShortcutA).toBeDefined();
    summaryShortcutA?.handler();

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Summary:');
      expect(lastFrame()).toContain('Email A summary');
    });

    rerender(<EmailDetail email={email2WithSummary} />);
    await flushEffects();

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Test Email 2');
      expect(lastFrame()).toContain('From:');
      expect(lastFrame()).not.toContain('Email A summary');
      expect(lastFrame()).not.toContain('Summary:');
    });

    const summaryShortcutB = getSummaryShortcut();
    expect(summaryShortcutB).toBeDefined();
    summaryShortcutB?.handler();

    await vi.waitFor(() => {
      expect(lastFrame()).toContain('Summary:');
      expect(lastFrame()).toContain('Email B summary');
      expect(lastFrame()).not.toContain('Email A summary');
    });
  });
});
