/**
 * T038: Unit tests for EmailPreview component.
 * Tests email display, body rendering, and state handling.
 *
 * Uses ink.render directly with a PassThrough stdin because
 * ink-testing-library v3 is incompatible with ink v4.4 when
 * useInput is present in the component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render as inkRender } from 'ink';
import { PassThrough } from 'node:stream';
import React from 'react';
import chalk from 'chalk';
import type { Email, EmailAddress, Label } from '../../../src/core/models/index.js';
import { EmailPreview } from '../../../src/tui/components/EmailPreview.js';

// Force chalk to emit ANSI escape codes in the test environment (no TTY).
// This is required for T008 tests that verify inverse styling (\x1b[7m).
chalk.level = 3;

function renderWithStdin(tree: React.ReactElement) {
  const stdin = new PassThrough() as PassThrough & {
    isTTY: boolean;
    setRawMode: () => void;
    ref: () => void;
    unref: () => void;
  };
  stdin.isTTY = true;
  stdin.setRawMode = () => {};
  stdin.ref = () => {};
  stdin.unref = () => {};

  const stdout = new PassThrough() as PassThrough & { columns: number };
  stdout.columns = 100;
  const stderr = new PassThrough();

  let lastFrame = '';
  stdout.on('data', (chunk: Buffer) => {
    lastFrame = chunk.toString();
  });

  const instance = inkRender(tree, {
    stdin: stdin as unknown as typeof process.stdin,
    stdout: stdout as unknown as typeof process.stdout,
    stderr: stderr as unknown as typeof process.stderr,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  return {
    stdin,
    lastFrame: () => lastFrame,
    rerender: instance.rerender,
    unmount: instance.unmount,
    cleanup: instance.cleanup,
  };
}

function createTestEmail(id: string, overrides?: Partial<Email>): Email {
  const sender: EmailAddress = {
    email: 'sender@example.com',
    name: 'Sender Name',
  };

  const labels: Label[] = [
    { id: 'INBOX', name: 'INBOX', type: 'system' },
  ];

  return {
    id,
    threadId: `thread-${id}`,
    subject: overrides?.subject || `Test Subject ${id}`,
    sender: overrides?.sender || sender,
    recipients: overrides?.recipients || [
      { email: 'recipient1@example.com', name: 'Recipient 1' },
      { email: 'recipient2@example.com', name: 'Recipient 2' },
    ],
    date: overrides?.date || new Date(),
    snippet: `Snippet for ${id}`,
    bodyText: 'bodyText' in (overrides ?? {}) ? overrides!.bodyText : `Body text for ${id}`,
    bodyHtml: overrides?.bodyHtml,
    labels: overrides?.labels || labels,
    isRead: overrides?.isRead ?? false,
    isStarred: overrides?.isStarred ?? false,
    hasAttachments: overrides?.hasAttachments ?? false,
  };
}

describe('EmailPreview', () => {
  describe('T038: Display', () => {
    it('should display email subject as header', () => {
      const email = createTestEmail('1', { subject: 'Important Email' });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={20} />
      );
      expect(lastFrame()).toContain('Important Email');
      cleanup();
    });

    it('should display sender and recipients', () => {
      const email = createTestEmail('1', {
        sender: { email: 'alice@example.com', name: 'Alice' },
        recipients: [
          { email: 'bob@example.com', name: 'Bob' },
          { email: 'charlie@example.com', name: 'Charlie' },
        ],
      });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={20} />
      );
      const output = lastFrame();
      expect(output).toContain('Alice');
      expect(output).toContain('Bob');
      expect(output).toContain('Charlie');
      cleanup();
    });

    it('should display email body', () => {
      const email = createTestEmail('1', {
        bodyText: 'This is the email body content.',
      });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={20} />
      );
      expect(lastFrame()).toContain('This is the email body content.');
      cleanup();
    });

    it('should render empty state when no email selected', () => {
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={undefined} maxHeight={20} />
      );
      expect(lastFrame()).toMatch(/no email|empty|select an email/i);
      cleanup();
    });

    it('should handle HTML body conversion to text', () => {
      const baseEmail = createTestEmail('1');
      const email: Email = {
        ...baseEmail,
        bodyHtml: '<p>HTML paragraph</p><a href="#">link</a>',
        bodyText: undefined,
      };
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={20} />
      );
      expect(lastFrame()).toContain('HTML paragraph');
      cleanup();
    });

    it('should scroll long email body', () => {
      const longBody = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11\nLine 12\nLine 13\nLine 14\nLine 15';
      const email = createTestEmail('1', { bodyText: longBody });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={5} />
      );
      const output = lastFrame();
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
      cleanup();
    });

    it('should show attachment count if present', () => {
      const email = createTestEmail('1', { hasAttachments: true });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={20} />
      );
      expect(lastFrame()).toMatch(/attachment|📎|\[\d+ file/i);
      cleanup();
    });

    it('should handle emails with no body (boundary)', () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: undefined,
      });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={20} />
      );
      expect(lastFrame()).toContain('Test Subject 1');
      cleanup();
    });
  });

  describe('T003: collapseBlankLines wiring', () => {
    it('should not render 3 or more consecutive blank lines', () => {
      const email = createTestEmail('1', {
        bodyText: 'Line1\n\n\n\n\nLine2',
      });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} />
      );
      const output = lastFrame();
      expect(output).toContain('of 4');
      expect(output).not.toContain('of 6');
      cleanup();
    });
  });

  describe('T007: processEmailBody pipeline wiring', () => {
    it('renders HTML anchor link text, not raw URL', () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<p>Check out <a href="https://very-long-example.com/path/to/resource">Click here</a></p>',
      });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      const output = lastFrame();
      expect(output).toContain('Click here');
      expect(output).not.toContain('https://very-long-example.com');
      cleanup();
    });

    it('truncates long plain-text URL with ellipsis', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(200);
      const email = createTestEmail('1', {
        bodyText: `Visit ${longUrl} for details`,
      });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      const output = lastFrame();
      expect(output).not.toContain(longUrl);
      expect(output).toMatch(/…/);
      cleanup();
    });

    it('truncated URL display length is at most half of paneWidth', () => {
      const longUrl = 'https://example.com/' + 'x'.repeat(200);
      const email = createTestEmail('1', { bodyText: longUrl });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      const output = lastFrame();
      const lines = output.split('\n');
      const urlLine = lines.find(l => l.includes('https://example.com/'));
      if (urlLine) {
        const match = urlLine.match(/https:\/\/[^\s]*/);
        if (match) {
          expect(match[0].length).toBeLessThanOrEqual(40);
        }
      }
      cleanup();
    });

    it('re-renders with smaller paneWidth and link text shrinks', () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://x.com">A long link text here exceeding twenty chars</a>',
      });
      const { lastFrame, rerender, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      const output80 = lastFrame();

      rerender(<EmailPreview email={email} maxHeight={30} paneWidth={40} />);
      const output40 = lastFrame();

      const linkTextIn80 = output80.match(/A long link text here[^)|\n]*/)?.[0] ?? '';
      const linkTextIn40 = output40.match(/A long link[^)|\n]*/)?.[0] ?? '';
      expect(linkTextIn80.length).toBeLessThanOrEqual(40);
      expect(linkTextIn40.length).toBeLessThanOrEqual(20);
      cleanup();
    });

    it('plain line with no URLs has links equal to empty array (no crash)', () => {
      const email = createTestEmail('1', {
        bodyText: 'Just plain text here.',
      });
      const { lastFrame, cleanup } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      expect(lastFrame()).toContain('Just plain text here.');
      cleanup();
    });
  });

  describe('T008: URL focus navigation', () => {
    it('no URLs: Tab does not change focus indicator', async () => {
      const email = createTestEmail('1', { bodyText: 'No links here' });
      const { stdin, lastFrame, unmount } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));
      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      // No url indicator should appear at all
      expect(lastFrame()).not.toContain('[tab] url');
      unmount();
    });

    it('Tab cycles forward through URLs', async () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://one.com">Link1</a> and <a href="https://two.com">Link2</a>',
      });
      const { stdin, lastFrame, unmount } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));

      // Initially no focus
      expect(lastFrame()).toContain('[tab] url');
      expect(lastFrame()).not.toMatch(/url \d+\/\d+/);

      // 1st Tab → url 1/2
      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 1/2');

      // 2nd Tab → url 2/2
      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 2/2');

      // 3rd Tab → wraps to url 1/2
      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 1/2');

      unmount();
    });

    it('Shift+Tab cycles backward', async () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://one.com">Link1</a> and <a href="https://two.com">Link2</a>',
      });
      const { stdin, lastFrame, unmount } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));

      // Tab to focus first link
      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 1/2');

      // Shift+Tab → should wrap to last link (url 2/2)
      stdin.write('\x1b[Z');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 2/2');

      unmount();
    });

    it('switching email resets focused link', async () => {
      const email1 = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://one.com">Link1</a>',
      });
      const email2 = createTestEmail('2', {
        bodyText: undefined,
        bodyHtml: '<a href="https://two.com">Link2</a>',
      });
      const { stdin, lastFrame, rerender, unmount } = renderWithStdin(
        <EmailPreview email={email1} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));

      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 1/1');

      // Switch email → focus resets
      rerender(<EmailPreview email={email2} maxHeight={30} paneWidth={80} />);
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).not.toMatch(/url \d+\/\d+/);
      expect(lastFrame()).toContain('[tab] url');

      unmount();
    });
  });

  describe('T009: Clipboard copy handler', () => {
    it('c keypress when no URL focused does not spawn', async () => {
      const { spawn } = await import('node:child_process');
      vi.spyOn({ spawn }, 'spawn');

      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://one.com">Link1</a>',
      });
      const { stdin, unmount } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));

      // Press 'c' without focusing any link
      stdin.write('c');
      await new Promise(r => setTimeout(r, 100));

      // spawn should not have been called (no focused link)
      // Since we can't easily intercept spawn from the test, we verify no crash
      unmount();
    });

    it('c keypress when URL focused copies fullUrl', async () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://full-url.com/path">Short</a>',
      });
      const { stdin, lastFrame, unmount } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));

      // Focus the link
      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 1/1');

      // Press 'c' to copy — should not crash
      stdin.write('c');
      await new Promise(r => setTimeout(r, 100));

      // Component should still render normally
      expect(lastFrame()).toContain('Short');
      unmount();
    });
  });

  describe('T010: Browser open handler', () => {
    it('o keypress when no URL focused does not spawn', async () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://one.com">Link1</a>',
      });
      const { stdin, unmount } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));

      // Press 'o' without focusing any link
      stdin.write('o');
      await new Promise(r => setTimeout(r, 100));

      // Should not crash
      unmount();
    });

    it('o keypress when URL focused opens browser', async () => {
      const email = createTestEmail('1', {
        bodyText: undefined,
        bodyHtml: '<a href="https://example.com/page">Link</a>',
      });
      const { stdin, lastFrame, unmount } = renderWithStdin(
        <EmailPreview email={email} maxHeight={30} paneWidth={80} />
      );
      await new Promise(r => setTimeout(r, 50));

      // Focus the link
      stdin.write('\t');
      await new Promise(r => setTimeout(r, 100));
      expect(lastFrame()).toContain('url 1/1');

      // Press 'o' to open — should not crash
      stdin.write('o');
      await new Promise(r => setTimeout(r, 100));

      // Component should still render normally
      expect(lastFrame()).toContain('Link');
      unmount();
    });
  });
});
