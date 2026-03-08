/**
 * T002: Unit tests for EmailCache getSummary / setSummary methods.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir } from 'fs/promises';
import { EmailCache } from '../../../src/core/cache/db.js';
import type { EmailSummary } from '../../../src/core/models/index.js';

function makeSummary(emailId: string, overrides: Partial<EmailSummary> = {}): EmailSummary {
  return {
    emailId,
    oneSentence: 'This is a test email about something important.',
    actionItems: ['Review the proposal', 'Reply by Friday'],
    generatedAt: new Date('2026-03-07T12:00:00Z'),
    ...overrides,
  };
}

describe('EmailCache — email_summaries', () => {
  let cache: EmailCache;
  let testDir: string;
  let dbPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-summary-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    cache = new EmailCache(dbPath);
    await cache.initialize();
  });

  afterEach(async () => {
    cache.close();
    await rm(testDir, { recursive: true, force: true });
  });

  it('creates email_summaries table on initialize', () => {
    // Verified by the fact that setSummary / getSummary work without error
    const result = cache.getSummary('nonexistent');
    expect(result).toBeNull();
  });

  it('upsert and retrieve round-trip', () => {
    const summary = makeSummary('email-1');
    cache.setSummary('email-1', summary);

    const retrieved = cache.getSummary('email-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.emailId).toBe('email-1');
    expect(retrieved!.oneSentence).toBe(summary.oneSentence);
    expect(retrieved!.actionItems).toEqual(summary.actionItems);
    expect(retrieved!.generatedAt).toEqual(summary.generatedAt);
  });

  it('returns null for missing entry', () => {
    expect(cache.getSummary('does-not-exist')).toBeNull();
  });

  it('overwrite updates existing summary', () => {
    const original = makeSummary('email-2', { oneSentence: 'Original sentence.' });
    cache.setSummary('email-2', original);

    const updated = makeSummary('email-2', { oneSentence: 'Updated sentence.' });
    cache.setSummary('email-2', updated);

    const retrieved = cache.getSummary('email-2');
    expect(retrieved!.oneSentence).toBe('Updated sentence.');
  });

  it('stores empty actionItems array correctly', () => {
    const summary = makeSummary('email-3', { actionItems: [] });
    cache.setSummary('email-3', summary);

    const retrieved = cache.getSummary('email-3');
    expect(retrieved!.actionItems).toEqual([]);
  });
});
