/**
 * T006/T009: Unit tests for EmailPreview summary view rendering.
 *
 * Uses ink.render with PassThrough stdin (same pattern as EmailPreview.test.tsx).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render as inkRender } from 'ink';
import { PassThrough } from 'node:stream';
import React from 'react';
import type { Email } from '../../../src/core/models/index.js';
import type { EmailSummary } from '../../../src/core/models/index.js';
import { EmailPreview } from '../../../src/tui/components/EmailPreview.js';
import type { SummaryState } from '../../../src/tui/hooks/useEmailSummary.js';

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
    lastFrame: () => lastFrame,
    rerender: instance.rerender,
    unmount: instance.unmount,
    cleanup: instance.cleanup,
  };
}

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Test Subject',
    sender: { email: 'alice@example.com', name: 'Alice' },
    recipients: [{ email: 'bob@example.com', name: 'Bob' }],
    date: new Date('2026-03-07'),
    snippet: 'Snippet text',
    bodyText: 'Full email body content here.',
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<EmailSummary> = {}): EmailSummary {
  return {
    emailId: 'email-1',
    oneSentence: 'Alice is requesting a meeting.',
    actionItems: ['Confirm your availability', 'Prepare agenda'],
    generatedAt: new Date(),
    ...overrides,
  };
}

const readyState = (summary: EmailSummary): SummaryState => ({
  status: 'ready',
  summary,
  error: null,
});

const loadingState: SummaryState = { status: 'loading', summary: null, error: null };
const errorState: SummaryState = { status: 'error', summary: null, error: 'Request failed' };

describe('EmailPreview — summary view', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
  });

  it('viewMode=full renders full email unchanged', () => {
    const email = makeEmail();
    const { lastFrame, cleanup } = renderWithStdin(
      <EmailPreview email={email} maxHeight={20} viewMode="full" />
    );
    cleanups.push(cleanup);
    const frame = lastFrame();
    expect(frame).toContain('Full email body content here.');
    expect(frame).toContain('Test Subject');
  });

  it('status=ready renders one-sentence and bullet list', () => {
    const email = makeEmail();
    const summary = makeSummary();
    const { lastFrame, cleanup } = renderWithStdin(
      <EmailPreview
        email={email}
        maxHeight={20}
        viewMode="summary"
        summaryState={readyState(summary)}
      />
    );
    cleanups.push(cleanup);
    const frame = lastFrame();
    expect(frame).toContain('Alice is requesting a meeting.');
    expect(frame).toContain('Confirm your availability');
    expect(frame).toContain('Prepare agenda');
  });

  it('status=ready with empty actionItems renders "(No action items)"', () => {
    const email = makeEmail();
    const summary = makeSummary({ actionItems: [] });
    const { lastFrame, cleanup } = renderWithStdin(
      <EmailPreview
        email={email}
        maxHeight={20}
        viewMode="summary"
        summaryState={readyState(summary)}
      />
    );
    cleanups.push(cleanup);
    expect(lastFrame()).toContain('(No action items)');
  });

  it('[s] full view hint visible in summary mode (status=ready)', () => {
    const email = makeEmail();
    const summary = makeSummary();
    const { lastFrame, cleanup } = renderWithStdin(
      <EmailPreview
        email={email}
        maxHeight={20}
        viewMode="summary"
        summaryState={readyState(summary)}
      />
    );
    cleanups.push(cleanup);
    expect(lastFrame()).toContain('[s] full view');
  });

  it('status=loading renders loading indicator', () => {
    const email = makeEmail();
    const { lastFrame, cleanup } = renderWithStdin(
      <EmailPreview
        email={email}
        maxHeight={20}
        viewMode="summary"
        summaryState={loadingState}
      />
    );
    cleanups.push(cleanup);
    expect(lastFrame()).toContain('Generating summary');
  });

  it('status=error renders error message with retry instruction', () => {
    const email = makeEmail();
    const { lastFrame, cleanup } = renderWithStdin(
      <EmailPreview
        email={email}
        maxHeight={20}
        viewMode="summary"
        summaryState={errorState}
      />
    );
    cleanups.push(cleanup);
    const frame = lastFrame();
    expect(frame).toContain('Request failed');
    expect(frame).toContain("retry");
  });
});
