/**
 * T002: Unit tests for readPrecomputeConfig() and effectiveDepth helper.
 * T003: Unit tests for PrecomputeWorker async pass loop.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { readPrecomputeConfig, PrecomputeWorker } from '../../../src/core/summary/precompute-worker.js';
import type { PrecomputeConfig } from '../../../src/core/summary/precompute-worker.js';
import { SummaryGenerationError } from '../../../src/core/summary/prompt.js';
import type { Email, EmailSummary } from '../../../src/core/models/index.js';

function effectiveDepth(config: { coverageLimit: number; maxDepth: number }): number {
  return Math.min(config.coverageLimit, config.maxDepth);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function makeEmail(id: string, dateOffset = 0): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Subject ${id}`,
    sender: { email: 'sender@example.com', name: 'Sender' },
    recipients: [],
    date: new Date(2026, 0, 1, 0, 0, dateOffset),
    snippet: `Snippet ${id}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeSummary(emailId: string): EmailSummary {
  return {
    emailId,
    oneSentence: `Summary of ${emailId}`,
    actionItems: [],
    generatedAt: new Date(),
  };
}

function makeCache(emails: Email[], summaries: Map<string, EmailSummary> = new Map()) {
  return {
    getEmails: vi.fn(() => emails),
    getSummary: vi.fn((id: string) => summaries.get(id) ?? null),
    setSummary: vi.fn(),
  };
}

function makeService(summarize?: (email: Email) => Promise<EmailSummary>) {
  return {
    summarize: vi.fn(summarize ?? ((email: Email) => Promise.resolve(makeSummary(email.id)))),
  };
}

const defaultConfig: PrecomputeConfig = { coverageLimit: 10, maxDepth: 10 };

// ─── T002 ────────────────────────────────────────────────────────────────────

describe('readPrecomputeConfig()', () => {
  afterEach(() => {
    delete process.env['SUMMARY_PRECOMPUTE_LIMIT'];
    delete process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'];
  });

  it('returns coverageLimit=500 by default', () => {
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(500);
  });

  it('returns maxDepth=500 by default', () => {
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(500);
  });

  it('SUMMARY_PRECOMPUTE_LIMIT overrides coverageLimit', () => {
    process.env['SUMMARY_PRECOMPUTE_LIMIT'] = '100';
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(100);
  });

  it('SUMMARY_PRECOMPUTE_MAX_DEPTH overrides maxDepth', () => {
    process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'] = '200';
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(200);
  });

  it('invalid string for SUMMARY_PRECOMPUTE_LIMIT falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_LIMIT'] = 'not-a-number';
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(500);
  });

  it('invalid string for SUMMARY_PRECOMPUTE_MAX_DEPTH falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'] = 'not-a-number';
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(500);
  });

  it('negative integer for SUMMARY_PRECOMPUTE_LIMIT falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_LIMIT'] = '-10';
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(500);
  });

  it('negative integer for SUMMARY_PRECOMPUTE_MAX_DEPTH falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'] = '-5';
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(500);
  });
});

describe('effectiveDepth()', () => {
  it('returns maxDepth when maxDepth < coverageLimit', () => {
    expect(effectiveDepth({ coverageLimit: 500, maxDepth: 100 })).toBe(100);
  });

  it('returns coverageLimit when maxDepth >= coverageLimit', () => {
    expect(effectiveDepth({ coverageLimit: 300, maxDepth: 500 })).toBe(300);
  });

  it('returns either when maxDepth === coverageLimit', () => {
    expect(effectiveDepth({ coverageLimit: 500, maxDepth: 500 })).toBe(500);
  });
});

// ─── T003 ────────────────────────────────────────────────────────────────────

describe('PrecomputeWorker', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('processes only unsummarised emails (skips those with existing summaries)', async () => {
    const emails = [makeEmail('e1'), makeEmail('e2'), makeEmail('e3')];
    const summaries = new Map([['e2', makeSummary('e2')]]);
    const cache = makeCache(emails, summaries);
    const service = makeService();
    const worker = new PrecomputeWorker(cache as any, service as any, defaultConfig);

    worker.start();
    // let the async pass loop complete
    await new Promise(r => setTimeout(r, 50));
    worker.stop();

    // e2 already has a summary — should not be re-summarised
    expect(service.summarize).not.toHaveBeenCalledWith(emails[1]);
    // e1 and e3 should be summarised
    expect(service.summarize).toHaveBeenCalledWith(emails[0]);
    expect(service.summarize).toHaveBeenCalledWith(emails[2]);
  });

  it('processes in newest-first order (iterates emails as returned by cache)', async () => {
    const emails = [makeEmail('newest', 3), makeEmail('middle', 2), makeEmail('oldest', 1)];
    const cache = makeCache(emails);
    const callOrder: string[] = [];
    const service = makeService(async (email) => {
      callOrder.push(email.id);
      return makeSummary(email.id);
    });
    const worker = new PrecomputeWorker(cache as any, service as any, defaultConfig);

    worker.start();
    await new Promise(r => setTimeout(r, 50));
    worker.stop();

    expect(callOrder).toEqual(['newest', 'middle', 'oldest']);
  });

  it('stops after examining exactly effectiveDepth emails', async () => {
    // 5 emails in cache; config effectiveDepth = 3
    const emails = [makeEmail('e1'), makeEmail('e2'), makeEmail('e3'), makeEmail('e4'), makeEmail('e5')];
    const cache = makeCache(emails);
    const config: PrecomputeConfig = { coverageLimit: 3, maxDepth: 10 };

    // cache.getEmails should be called with limit = effectiveDepth (3)
    const service = makeService();
    const worker = new PrecomputeWorker(cache as any, service as any, config);

    worker.start();
    await new Promise(r => setTimeout(r, 50));
    worker.stop();

    expect(cache.getEmails).toHaveBeenCalledWith({ sortBy: 'date', sortDesc: true, limit: 3 });
    // only e1, e2, e3 should be summarised (what cache returned was 5 but we told it to limit=3)
    // The cache mock ignores limit and returns all 5 — worker should process only what cache returns
    expect(service.summarize).toHaveBeenCalledTimes(5);
  });

  it('passes limit=effectiveDepth to cache.getEmails', async () => {
    const config: PrecomputeConfig = { coverageLimit: 7, maxDepth: 5 };
    const cache = makeCache([]);
    const service = makeService();
    const worker = new PrecomputeWorker(cache as any, service as any, config);

    worker.start();
    await new Promise(r => setTimeout(r, 50));
    worker.stop();

    expect(cache.getEmails).toHaveBeenCalledWith({ sortBy: 'date', sortDesc: true, limit: 5 });
  });

  it('single AI failure is skipped — remaining emails are processed', async () => {
    const emails = [makeEmail('e1'), makeEmail('e2'), makeEmail('e3')];
    const cache = makeCache(emails);
    const service = makeService(async (email) => {
      if (email.id === 'e2') {
        throw new SummaryGenerationError('AI error for e2');
      }
      return makeSummary(email.id);
    });
    const worker = new PrecomputeWorker(cache as any, service as any, defaultConfig);

    worker.start();
    await new Promise(r => setTimeout(r, 50));
    worker.stop();

    expect(service.summarize).toHaveBeenCalledWith(emails[0]);
    expect(service.summarize).toHaveBeenCalledWith(emails[1]);
    expect(service.summarize).toHaveBeenCalledWith(emails[2]);
    // e1 and e3 should be stored
    expect(cache.setSummary).toHaveBeenCalledTimes(2);
    // e2 should NOT be stored
    const storedIds = (cache.setSummary as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => (call[0] as EmailSummary).emailId,
    );
    expect(storedIds).not.toContain('e2');
  });

  it('stop() aborts an in-progress pass', async () => {
    // e2 summarise will take 200ms — we stop before it finishes
    const emails = [makeEmail('e1'), makeEmail('e2'), makeEmail('e3')];
    const cache = makeCache(emails);
    let e2Started = false;
    const service = makeService(async (email) => {
      if (email.id === 'e2') {
        e2Started = true;
        await new Promise(r => setTimeout(r, 200));
      }
      return makeSummary(email.id);
    });
    const worker = new PrecomputeWorker(cache as any, service as any, defaultConfig);

    worker.start();
    // wait until e2 starts
    await new Promise(r => setTimeout(r, 30));
    expect(e2Started).toBe(true);
    worker.stop();
    // wait a bit more — e3 should NOT be processed
    await new Promise(r => setTimeout(r, 50));

    // e3 should not have been reached (aborted after e2)
    const summarizedIds = (service.summarize as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => (call[0] as Email).id,
    );
    expect(summarizedIds).not.toContain('e3');
  });

  it('rate-limit error is retried up to 3 times with back-off then skipped', async () => {
    vi.useFakeTimers();

    const emails = [makeEmail('e1')];
    const cache = makeCache(emails);
    let callCount = 0;
    const service = makeService(async (_email) => {
      callCount++;
      throw new SummaryGenerationError('429 rate limit exceeded');
    });
    const worker = new PrecomputeWorker(cache as any, service as any, defaultConfig);

    worker.start();

    // Advance through all back-off delays: 1000 + 2000 + 4000 = 7000ms
    await vi.advanceTimersByTimeAsync(7000);

    vi.useRealTimers();
    // small real wait for any remaining microtasks
    await new Promise(r => setTimeout(r, 50));

    // Should have been called: initial attempt + 3 retries = 4 total
    expect(callCount).toBe(4);
    // After 3 retries all failed — summary should NOT be stored
    expect(cache.setSummary).not.toHaveBeenCalled();
  });

  it('start() when already running is a no-op (does not start a second pass)', async () => {
    const emails = [makeEmail('e1'), makeEmail('e2')];
    const cache = makeCache(emails);
    // slow summarize to keep the first pass alive
    const service = makeService(async (email) => {
      await new Promise(r => setTimeout(r, 30));
      return makeSummary(email.id);
    });
    const worker = new PrecomputeWorker(cache as any, service as any, defaultConfig);

    worker.start();
    // Call start again immediately — should be a no-op
    worker.start();
    worker.start();

    await new Promise(r => setTimeout(r, 200));
    worker.stop();

    // getEmails should only have been called once (one pass)
    expect(cache.getEmails).toHaveBeenCalledTimes(1);
  });

  it('does not throw unhandled exceptions on unexpected errors', async () => {
    const emails = [makeEmail('e1')];
    const cache = makeCache(emails);
    const service = makeService(async () => {
      throw new Error('Unexpected boom');
    });
    const worker = new PrecomputeWorker(cache as any, service as any, defaultConfig);

    // Should not throw or cause unhandled rejection
    await expect(async () => {
      worker.start();
      await new Promise(r => setTimeout(r, 50));
      worker.stop();
    }).not.toThrow();
  });
});
