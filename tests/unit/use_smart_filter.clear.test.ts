import { describe, expect, it, vi } from 'vitest';

import type { EmailClassification } from '@/adapters/ai/provider.js';
import { createEmail } from '@/core/entities.js';
import { useSmartFilter } from '@/tui/use_smart_filter.js';

const EMAILS = [
  createEmail({
    message_id: 'msg-1',
    received_at: Date.parse('2026-02-10T10:00:00Z'),
    subject: 'Newsletter'
  }),
  createEmail({
    message_id: 'msg-2',
    received_at: Date.parse('2026-02-11T10:00:00Z'),
    subject: 'Receipt'
  })
];

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useSmartFilter clear edge cases', () => {
  it('should cancel an in-flight evaluation and ignore late completion after clear', async () => {
    const run = deferred<{
      allResults: EmailClassification[];
      matchingResults: EmailClassification[];
      totalEvaluated: number;
    }>();
    let capturedSignal: AbortSignal | undefined;

    const runSmartFilter = vi.fn().mockImplementation((input: { signal?: AbortSignal }) => {
      capturedSignal = input.signal;
      return run.promise;
    });

    const filter = useSmartFilter({
      emails: EMAILS,
      provider: { classifyEmails: vi.fn() },
      runSmartFilter
    });

    filter.beginInput();
    filter.setDraft('receipts');
    const pendingSubmit = filter.submit();

    filter.clear();
    expect(filter.state.status).toBe('idle');
    expect(filter.state.visibleEmailIds).toEqual(['msg-1', 'msg-2']);
    expect(capturedSignal?.aborted).toBe(true);

    run.resolve({
      allResults: [{ emailId: 'msg-2', matches: true, confidence: 0.9 }],
      matchingResults: [{ emailId: 'msg-2', matches: true, confidence: 0.9 }],
      totalEvaluated: 1
    });

    await pendingSubmit;

    expect(filter.state.status).toBe('idle');
    expect(filter.state.visibleEmailIds).toEqual(['msg-1', 'msg-2']);
    expect(filter.state.summaryLine).toBe('');
  });

  it('should reset draft/error state when clear is invoked from input/error state', async () => {
    const filter = useSmartFilter({
      emails: EMAILS,
      provider: null,
      runSmartFilter: vi.fn()
    });

    filter.beginInput();
    filter.setDraft('receipts');
    await filter.submit();

    expect(filter.state.status).toBe('error');
    expect(filter.state.errorMessage).toBeTruthy();

    filter.clear();

    expect(filter.state.status).toBe('idle');
    expect(filter.state.draft).toBe('');
    expect(filter.state.errorMessage).toBeUndefined();
    expect(filter.state.description).toBe('');
  });
});
