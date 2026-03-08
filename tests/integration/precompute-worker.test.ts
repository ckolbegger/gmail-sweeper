/**
 * T004: Integration test — PrecomputeWorker processes unsummarised emails and
 * persists summaries durably in SQLite.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir } from 'fs/promises';
import { EmailCache } from '../../src/core/cache/db.js';
import { PrecomputeWorker } from '../../src/core/summary/precompute-worker.js';
import type { Email } from '../../src/core/models/index.js';
import type { EmailSummary } from '../../src/core/models/index.js';

function makeEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Subject for ${id}`,
    sender: { email: 'sender@example.com', name: 'Sender' },
    recipients: [{ email: 'me@example.com' }],
    date: new Date('2026-03-01T10:00:00.000Z'),
    snippet: `Snippet for ${id}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeMockSummaryService() {
  return {
    summarize: vi.fn().mockImplementation(async (email: Email): Promise<EmailSummary> => ({
      emailId: email.id,
      oneSentence: `Summary for ${email.id}`,
      actionItems: [],
      generatedAt: new Date(),
    })),
  };
}

const FIVE_EMAILS = ['email-1', 'email-2', 'email-3', 'email-4', 'email-5'].map(makeEmail);

describe('PrecomputeWorker integration', () => {
  let testDir: string;
  let dbPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-precompute-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('processes all unsummarised emails in a 5-email fixture', async () => {
    const cache = new EmailCache(dbPath);
    await cache.initialize();
    cache.upsertEmails(FIVE_EMAILS);

    const mockService = makeMockSummaryService();
    const worker = new PrecomputeWorker(cache, mockService as any, { coverageLimit: 500, maxDepth: 500 });

    worker.start();
    // Poll until all 5 summaries are written (max 2s)
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 50));
      const allDone = FIVE_EMAILS.every(e => cache.getSummary(e.id) !== null);
      if (allDone) break;
    }

    for (const email of FIVE_EMAILS) {
      const summary = cache.getSummary(email.id);
      expect(summary, `Missing summary for ${email.id}`).not.toBeNull();
      expect(summary!.emailId).toBe(email.id);
      expect(summary!.oneSentence).toBe(`Summary for ${email.id}`);
    }

    expect(mockService.summarize).toHaveBeenCalledTimes(5);
    cache.close();
  });

  it('persisted summaries survive cache.close() + re-open + getSummary() round-trip', async () => {
    const cache1 = new EmailCache(dbPath);
    await cache1.initialize();
    cache1.upsertEmails(FIVE_EMAILS);

    const mockService = makeMockSummaryService();
    const worker = new PrecomputeWorker(cache1, mockService as any, { coverageLimit: 500, maxDepth: 500 });

    worker.start();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 50));
      const allDone = FIVE_EMAILS.every(e => cache1.getSummary(e.id) !== null);
      if (allDone) break;
    }

    cache1.close();

    // Re-open fresh cache instance at same path
    const cache2 = new EmailCache(dbPath);
    await cache2.initialize();

    for (const email of FIVE_EMAILS) {
      const summary = cache2.getSummary(email.id);
      expect(summary, `Summary not persisted for ${email.id}`).not.toBeNull();
      expect(summary!.emailId).toBe(email.id);
      expect(summary!.oneSentence).toBe(`Summary for ${email.id}`);
    }

    cache2.close();
  });

  it('stop() mid-pass leaves already-written summaries intact with no corruption', async () => {
    const cache = new EmailCache(dbPath);
    await cache.initialize();
    cache.upsertEmails(FIVE_EMAILS);

    // Slow mock: 50ms per summarise call
    const slowService = {
      summarize: vi.fn().mockImplementation(async (email: Email): Promise<EmailSummary> => {
        await new Promise(r => setTimeout(r, 50));
        return {
          emailId: email.id,
          oneSentence: `Summary for ${email.id}`,
          actionItems: [],
          generatedAt: new Date(),
        };
      }),
    };

    const worker = new PrecomputeWorker(cache, slowService as any, { coverageLimit: 500, maxDepth: 500 });
    worker.start();

    // Allow at least one (but not all) emails to be processed, then stop
    await new Promise(r => setTimeout(r, 75));
    worker.stop();

    // Count how many summaries were written before stop
    const writtenBeforeStop = FIVE_EMAILS.filter(e => cache.getSummary(e.id) !== null);

    // At least one should have been written (first call takes ~50ms, we waited 75ms)
    expect(writtenBeforeStop.length).toBeGreaterThanOrEqual(1);
    // Not all should be written (we stopped before 5 * 50ms = 250ms)
    expect(writtenBeforeStop.length).toBeLessThan(5);

    // Verify no corruption: all written summaries are valid
    for (const email of writtenBeforeStop) {
      const summary = cache.getSummary(email.id);
      expect(summary).not.toBeNull();
      expect(summary!.emailId).toBe(email.id);
      expect(summary!.oneSentence).toBe(`Summary for ${email.id}`);
      expect(Array.isArray(summary!.actionItems)).toBe(true);
    }

    // Verify emails without summaries still have valid email records
    const notSummarised = FIVE_EMAILS.filter(e => cache.getSummary(e.id) === null);
    const allEmails = cache.getEmails({ limit: 0 });
    expect(allEmails.length).toBe(5);

    // All not-yet-summarised email IDs should still exist in the cache
    for (const email of notSummarised) {
      const found = allEmails.find(e => e.id === email.id);
      expect(found, `Email ${email.id} should still exist in cache`).toBeDefined();
    }

    cache.close();
  });
});
