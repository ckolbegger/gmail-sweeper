/**
 * T011: Integration tests for detail pane content formatting.
 * Uses REAL (unmocked) body-formatter functions — only child_process is mocked for scenario (f).
 */

import './setup-force-color.js';
import { describe, it, expect, afterEach } from 'vitest';
import { render as inkRender } from 'ink';
import { PassThrough } from 'node:stream';
import React from 'react';
import type { Email, EmailAddress, Label } from '../../src/core/models/index.js';
import { EmailPreview } from '../../src/tui/components/EmailPreview.js';

function createTestEmail(id: string, overrides?: Partial<Email>): Email {
  const sender: EmailAddress = { email: 'sender@example.com', name: 'Sender Name' };
  const labels: Label[] = [{ id: 'INBOX', name: 'INBOX', type: 'system' }];

  return {
    id,
    threadId: `thread-${id}`,
    subject: overrides?.subject || `Test Subject ${id}`,
    sender: overrides?.sender || sender,
    recipients: overrides?.recipients || [{ email: 'r@example.com', name: 'Recipient' }],
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

function createInkRenderer(tree: React.ReactElement) {
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

  const frames: string[] = [];
  stdout.on('data', (chunk: Buffer) => {
    frames.push(chunk.toString());
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
    lastFrame: () => frames[frames.length - 1] ?? '',
    rerender: instance.rerender,
    unmount: instance.unmount,
  };
}

describe('T011: Integration — email-preview-formatting', () => {
  let unmountFn: (() => void) | undefined;

  afterEach(() => {
    unmountFn?.();
    unmountFn = undefined;
  });

  it('(a) HTML email with 5 blank lines + 2 anchors: blank lines collapsed, anchor texts visible', async () => {
    const html = [
      '<p>Intro paragraph</p>',
      '<br/><br/><br/><br/><br/>',
      '<p>Check <a href="https://example.com/first">First Link</a> and <a href="https://example.com/second">Second Link</a></p>',
    ].join('');

    const email = createTestEmail('a', {
      bodyText: undefined,
      bodyHtml: html,
    });

    const { lastFrame, unmount } = createInkRenderer(
      <EmailPreview email={email} maxHeight={40} paneWidth={80} />
    );
    unmountFn = unmount;
    await new Promise(r => setTimeout(r, 50));

    const output = lastFrame();

    // Both anchor texts visible
    expect(output).toContain('First Link');
    expect(output).toContain('Second Link');

    // No raw URLs visible
    expect(output).not.toContain('https://example.com/first');
    expect(output).not.toContain('https://example.com/second');

    // Blank line collapse: no run of 3+ consecutive blank lines
    const lines = output.split('\n');
    let consecutiveBlanks = 0;
    for (const line of lines) {
      if (line.trim() === '') {
        consecutiveBlanks++;
        expect(consecutiveBlanks).toBeLessThanOrEqual(2);
      } else {
        consecutiveBlanks = 0;
      }
    }
  });

  it('(b) Plain-text 200-char URL at paneWidth=80: truncated to ≤40 chars with ellipsis', async () => {
    const longUrl = 'https://example.com/' + 'x'.repeat(180);
    const email = createTestEmail('b', {
      bodyText: `Visit ${longUrl} for details`,
    });

    const { lastFrame, unmount } = createInkRenderer(
      <EmailPreview email={email} maxHeight={30} paneWidth={80} />
    );
    unmountFn = unmount;
    await new Promise(r => setTimeout(r, 50));

    const output = lastFrame();

    // Original long URL should NOT appear
    expect(output).not.toContain(longUrl);

    // Should contain ellipsis
    expect(output).toContain('…');

    // Find the truncated URL portion — starts with https://
    const bodyLines = output.split('\n');
    for (const line of bodyLines) {
      const urlMatch = line.match(/https:\/\/[^\s]*/);
      if (urlMatch) {
        expect(urlMatch[0].length).toBeLessThanOrEqual(40);
      }
    }
  });

  it('(c) mailto: address in plain text is detected and truncated', async () => {
    const longMailto = 'mailto:' + 'a'.repeat(100) + '@example.com';
    const email = createTestEmail('c', {
      bodyText: `Contact us at ${longMailto} for help`,
    });

    const { lastFrame, unmount } = createInkRenderer(
      <EmailPreview email={email} maxHeight={30} paneWidth={80} />
    );
    unmountFn = unmount;
    await new Promise(r => setTimeout(r, 50));

    const output = lastFrame();

    // Original full mailto should NOT appear (it's > 40 chars = half of 80)
    expect(output).not.toContain(longMailto);

    // Truncated version should have ellipsis
    expect(output).toContain('…');

    // The displayed mailto portion should be ≤ 40 chars
    const bodyLines = output.split('\n');
    for (const line of bodyLines) {
      const mailtoMatch = line.match(/mailto:[^\s]*/);
      if (mailtoMatch) {
        expect(mailtoMatch[0].length).toBeLessThanOrEqual(40);
      }
    }
  });

  it('(d) Plain text with no URLs renders identically (regression guard)', async () => {
    const plainBody = 'Hello,\n\nThis is a normal email with no links.\n\nBest regards,\nAlice';
    const email = createTestEmail('d', { bodyText: plainBody });

    const { lastFrame, unmount } = createInkRenderer(
      <EmailPreview email={email} maxHeight={30} paneWidth={80} />
    );
    unmountFn = unmount;
    await new Promise(r => setTimeout(r, 50));

    const output = lastFrame();

    // All content lines should appear unchanged
    expect(output).toContain('Hello,');
    expect(output).toContain('This is a normal email with no links.');
    expect(output).toContain('Best regards,');
    expect(output).toContain('Alice');

    // No ellipsis — nothing truncated
    expect(output).not.toContain('…');

    // No [tab] url hint since there are no links
    expect(output).not.toContain('[tab] url');
  });

  it('(e) Resize: paneWidth 80→40 shrinks displayed URL/link text to ≤20 chars', async () => {
    // Use a link text > 40 chars so it's truncated at both widths
    const linkText = 'A link text that is definitely longer than forty characters in total';
    const html = `<a href="https://example.com/very/long/path">${linkText}</a>`;
    const email = createTestEmail('e', {
      bodyText: undefined,
      bodyHtml: html,
    });

    const { lastFrame, rerender, unmount } = createInkRenderer(
      <EmailPreview email={email} maxHeight={30} paneWidth={80} />
    );
    unmountFn = unmount;
    await new Promise(r => setTimeout(r, 50));

    const output80 = lastFrame();

    rerender(<EmailPreview email={email} maxHeight={30} paneWidth={40} />);
    await new Promise(r => setTimeout(r, 50));
    const output40 = lastFrame();

    // At paneWidth=80 (halfWidth=40): displayed link text ≤ 40 chars
    // Find the link text line (not header, not scroll indicator)
    const linkLine80 = output80.split('\n').find(l => l.includes('A link text'));
    expect(linkLine80).toBeDefined();
    const linkPortion80 = linkLine80!.match(/A link text[^\n]*/);
    expect(linkPortion80).not.toBeNull();
    expect(linkPortion80![0].length).toBeLessThanOrEqual(40);

    // At paneWidth=40 (halfWidth=20): displayed link text ≤ 20 chars
    // The truncated text at halfWidth=20 starts with "A link text that is" (19) + "…" = 20
    const linkLine40 = output40.split('\n').find(l => l.includes('A link'));
    expect(linkLine40).toBeDefined();
    const linkPortion40 = linkLine40!.match(/A link[^\n]*/);
    expect(linkPortion40).not.toBeNull();
    expect(linkPortion40![0].length).toBeLessThanOrEqual(20);
  });

  it('(f) Tab focus: 2 anchors, Tab highlights first URL with inverse', async () => {
    const html = '<a href="https://one.com">LinkAlpha</a> text <a href="https://two.com">LinkBeta</a>';
    const email = createTestEmail('f', {
      bodyText: undefined,
      bodyHtml: html,
    });

    const { stdin, lastFrame, unmount } = createInkRenderer(
      <EmailPreview email={email} maxHeight={30} paneWidth={80} />
    );
    unmountFn = unmount;
    await new Promise(r => setTimeout(r, 50));

    // Before Tab — no url focus indicator shown
    expect(lastFrame()).not.toMatch(/url \d+\/\d+/);

    // Tab → first URL highlighted
    stdin.write('\t');
    await new Promise(r => setTimeout(r, 100));

    const output = lastFrame();
    // URL focus indicator: "url 1/2"
    expect(output).toMatch(/url 1\/2/);

    // [tab] url hint should be present
    expect(output).toContain('[tab] url');
  });
});
