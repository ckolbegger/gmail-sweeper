import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { SummaryObservabilityEvent } from '@/core/summary_observability.js';
import { createPersistedSummaryFixture } from './fixtures/ai_summary.fixtures.js';

import { createSummaryStore } from '@/adapters/storage/summary_store.js';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('summary store adapter', () => {
  it('should return null when summary file does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-'));
    tempDirs.push(dir);

    const store = createSummaryStore(join(dir, 'missing/email-summaries.json'));
    await expect(store.getByMessageId('msg-1')).resolves.toBeNull();
  });

  it('should upsert and retrieve summary records keyed by message id', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'session/email-summaries.json');
    const store = createSummaryStore(filePath);

    const first = createPersistedSummaryFixture({ messageId: 'msg-1' });
    const second = createPersistedSummaryFixture({
      messageId: 'msg-1',
      summarySentence: 'Updated summary sentence.'
    });

    await store.upsert(first);
    await store.upsert(second);

    await expect(store.getByMessageId('msg-1')).resolves.toEqual(second);

    const raw = await readFile(filePath, 'utf8');
    expect(raw).toContain('"version": 1');
    expect(raw).toContain('"msg-1"');
  });

  it('should treat malformed single entries as cache misses while preserving valid entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'email-summaries.json');
    const valid = createPersistedSummaryFixture({ messageId: 'msg-good' });

    await writeFile(
      filePath,
      JSON.stringify({ version: 1, summariesByMessageId: { 'msg-good': valid, 'msg-bad': 42 } }),
      'utf8'
    );
    const events: SummaryObservabilityEvent[] = [];
    const store = createSummaryStore(filePath, {
      observabilitySink: (event) => events.push(event)
    });

    await expect(store.getByMessageId('msg-good')).resolves.toEqual(valid);
    await expect(store.getByMessageId('msg-bad')).resolves.toBeNull();
    await store.upsert(
      createPersistedSummaryFixture({
        messageId: 'msg-bad',
        summarySentence: 'Recovered summary.'
      })
    );
    await expect(store.getByMessageId('msg-good')).resolves.toEqual(valid);
    await expect(store.getByMessageId('msg-bad')).resolves.toMatchObject({
      messageId: 'msg-bad',
      summarySentence: 'Recovered summary.'
    });

    const healed = JSON.parse(await readFile(filePath, 'utf8')) as {
      summariesByMessageId?: Record<string, unknown>;
    };
    expect(Object.keys(healed.summariesByMessageId ?? {}).sort()).toEqual(['msg-bad', 'msg-good']);
    expect(events.some((event) => event.event === 'summary_store_autoheal_sanitized')).toBe(true);
  });

  it('should auto-heal invalid JSON by backing it up and resetting the store file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'email-summaries.json');

    await writeFile(filePath, '{invalid-json', 'utf8');
    const events: SummaryObservabilityEvent[] = [];
    const store = createSummaryStore(filePath, {
      observabilitySink: (event) => events.push(event)
    });

    await expect(store.getByMessageId('msg-1')).resolves.toBeNull();

    const healed = JSON.parse(await readFile(filePath, 'utf8')) as {
      version?: number;
      summariesByMessageId?: Record<string, unknown>;
    };
    expect(healed.version).toBe(1);
    expect(healed.summariesByMessageId).toEqual({});

    const files = await readdir(dir);
    expect(files.some((name) => name.startsWith('email-summaries.json.corrupt-'))).toBe(true);
    expect(events.some((event) => event.event === 'summary_store_autoheal_reset')).toBe(true);
  });

  it('should reject malformed records before writing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-'));
    tempDirs.push(dir);
    const events: SummaryObservabilityEvent[] = [];
    const store = createSummaryStore(join(dir, 'email-summaries.json'), {
      observabilitySink: (event) => events.push(event)
    });

    await expect(
      store.upsert(
        createPersistedSummaryFixture({
          actionItems: []
        })
      )
    ).rejects.toThrow('Invalid summary record');
    expect(events.some((event) => event.event === 'summary_store_invalid_record_rejected')).toBe(true);
  });

  it('should serialize parallel upserts without dropping records', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-summary-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'email-summaries.json');
    const store = createSummaryStore(filePath);

    const records = Array.from({ length: 20 }, (_, index) =>
      createPersistedSummaryFixture({
        messageId: `msg-${index + 1}`,
        summarySentence: `Summary ${index + 1}.`
      })
    );

    await Promise.all(records.map((record) => store.upsert(record)));

    for (const record of records) {
      await expect(store.getByMessageId(record.messageId)).resolves.toEqual(record);
    }

    const files = await readdir(dir);
    expect(files.some((name) => name.includes('.tmp-'))).toBe(false);
  });
});
