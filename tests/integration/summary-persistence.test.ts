/**
 * T010: Integration test — summary persistence across EmailCache open/close cycles.
 * Validates FR-008: summaries persist across sessions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir } from 'fs/promises';
import { EmailCache } from '../../src/core/cache/db.js';
import type { EmailSummary } from '../../src/core/models/index.js';

function makeSummary(emailId: string): EmailSummary {
  return {
    emailId,
    oneSentence: 'This email is about a project deadline.',
    actionItems: ['Submit the report', 'Notify the team'],
    generatedAt: new Date('2026-03-07T10:00:00.000Z'),
  };
}

describe('Summary persistence (FR-008)', () => {
  let testDir: string;
  let dbPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-persist-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('summary written in one cache session is readable after close+reopen', async () => {
    // Session 1: generate and persist
    const cache1 = new EmailCache(dbPath);
    await cache1.initialize();
    const summary = makeSummary('email-persist-1');
    cache1.setSummary(summary);
    cache1.close();

    // Session 2: reopen and verify
    const cache2 = new EmailCache(dbPath);
    await cache2.initialize();
    const retrieved = cache2.getSummary('email-persist-1');
    cache2.close();

    expect(retrieved).not.toBeNull();
    expect(retrieved!.emailId).toBe('email-persist-1');
    expect(retrieved!.oneSentence).toBe(summary.oneSentence);
    expect(retrieved!.actionItems).toEqual(summary.actionItems);
    expect(retrieved!.generatedAt).toEqual(summary.generatedAt);
  });

  it('summary is not present if never written', async () => {
    const cache1 = new EmailCache(dbPath);
    await cache1.initialize();
    cache1.close();

    const cache2 = new EmailCache(dbPath);
    await cache2.initialize();
    const result = cache2.getSummary('never-written');
    cache2.close();

    expect(result).toBeNull();
  });

  it('overwrite persists the latest value', async () => {
    const cache1 = new EmailCache(dbPath);
    await cache1.initialize();
    cache1.setSummary(makeSummary('email-x'));
    const updated = { ...makeSummary('email-x'), oneSentence: 'Updated sentence.' };
    cache1.setSummary(updated);
    cache1.close();

    const cache2 = new EmailCache(dbPath);
    await cache2.initialize();
    const result = cache2.getSummary('email-x');
    cache2.close();

    expect(result!.oneSentence).toBe('Updated sentence.');
  });
});
