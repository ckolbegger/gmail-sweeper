import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { AiProviderConfig } from '@/adapters/ai/provider.js';
import {
  emitSummaryObservabilityEvent,
  redactMessageId,
  type SummaryObservabilitySink
} from '@/core/summary_observability.js';

const SUMMARY_STORE_VERSION = 1;
export const DEFAULT_SUMMARY_STORE_PATH = '.gmail-sweeper/email-summaries.json';

export interface PersistedEmailSummary {
  messageId: string;
  summarySentence: string;
  actionItems: string[];
  provider: AiProviderConfig['provider'];
  model: string;
  createdAt: string;
}

interface SummaryStoreDocument {
  version: number;
  summariesByMessageId: Record<string, PersistedEmailSummary>;
}

export interface SummaryStore {
  getByMessageId(messageId: string): Promise<PersistedEmailSummary | null>;
  upsert(record: PersistedEmailSummary): Promise<void>;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isValidPersistedSummary(value: unknown): value is PersistedEmailSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<PersistedEmailSummary>;
  return (
    typeof record.messageId === 'string' &&
    record.messageId.length > 0 &&
    typeof record.summarySentence === 'string' &&
    record.summarySentence.length > 0 &&
    isStringArray(record.actionItems) &&
    record.actionItems.length > 0 &&
    (record.provider === 'openai' || record.provider === 'anthropic') &&
    typeof record.model === 'string' &&
    record.model.length > 0 &&
    typeof record.createdAt === 'string' &&
    record.createdAt.length > 0
  );
}

function parseDocument(raw: string, filePath: string): SummaryStoreDocument {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid summary store payload in ${filePath}`);
  }

  const record = parsed as {
    version?: unknown;
    summariesByMessageId?: unknown;
  };
  if (record.version !== SUMMARY_STORE_VERSION) {
    throw new Error(`Invalid summary store payload in ${filePath}`);
  }
  if (!record.summariesByMessageId || typeof record.summariesByMessageId !== 'object') {
    throw new Error(`Invalid summary store payload in ${filePath}`);
  }

  const entries = Object.entries(record.summariesByMessageId as Record<string, unknown>);
  const summariesByMessageId: Record<string, PersistedEmailSummary> = {};
  for (const [messageId, summary] of entries) {
    if (!isValidPersistedSummary(summary) || summary.messageId !== messageId) {
      throw new Error(`Invalid summary store payload in ${filePath}`);
    }
    summariesByMessageId[messageId] = summary;
  }

  return {
    version: SUMMARY_STORE_VERSION,
    summariesByMessageId
  };
}

function sanitizeDocument(parsed: unknown): {
  document: SummaryStoreDocument;
  needsRewrite: boolean;
  droppedCount: number;
} {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      document: createEmptyDocument(),
      needsRewrite: true,
      droppedCount: 0
    };
  }

  const record = parsed as {
    version?: unknown;
    summariesByMessageId?: unknown;
  };
  let needsRewrite = record.version !== SUMMARY_STORE_VERSION;
  let droppedCount = 0;
  const summariesByMessageId: Record<string, PersistedEmailSummary> = {};

  if (!record.summariesByMessageId || typeof record.summariesByMessageId !== 'object') {
    return {
      document: createEmptyDocument(),
      needsRewrite: true,
      droppedCount: 0
    };
  }

  for (const [messageId, summary] of Object.entries(
    record.summariesByMessageId as Record<string, unknown>
  )) {
    if (!isValidPersistedSummary(summary) || summary.messageId !== messageId) {
      needsRewrite = true;
      droppedCount += 1;
      continue;
    }

    summariesByMessageId[messageId] = summary;
  }

  return {
    document: {
      version: SUMMARY_STORE_VERSION,
      summariesByMessageId
    },
    needsRewrite,
    droppedCount
  };
}

function createEmptyDocument(): SummaryStoreDocument {
  return {
    version: SUMMARY_STORE_VERSION,
    summariesByMessageId: {}
  };
}

function buildCorruptBackupPath(filePath: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${filePath}.corrupt-${stamp}`;
}

async function resetCorruptStoreFile(
  filePath: string,
  observabilitySink?: SummaryObservabilitySink
): Promise<SummaryStoreDocument> {
  const empty = createEmptyDocument();
  await mkdir(dirname(filePath), { recursive: true });
  const backupPath = buildCorruptBackupPath(filePath);

  try {
    await rename(filePath, backupPath);
  } catch {
    // Best effort backup: continue with fresh store creation.
  }

  await writeFile(filePath, JSON.stringify(empty, null, 2), 'utf8');
  emitSummaryObservabilityEvent(observabilitySink, {
    event: 'summary_store_autoheal_reset',
    details: {
      backupPath
    }
  });
  return empty;
}

async function readDocument(
  filePath: string,
  observabilitySink?: SummaryObservabilitySink
): Promise<SummaryStoreDocument> {
  try {
    const raw = await readFile(filePath, 'utf8');
    try {
      // Keep strict parser as a shape gate before healing.
      return parseDocument(raw, filePath);
    } catch {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        return resetCorruptStoreFile(filePath, observabilitySink);
      }

      const sanitized = sanitizeDocument(parsed);
      if (sanitized.needsRewrite) {
        await writeDocument(filePath, sanitized.document);
        emitSummaryObservabilityEvent(observabilitySink, {
          event: 'summary_store_autoheal_sanitized',
          details: {
            droppedEntries: sanitized.droppedCount
          }
        });
      }
      return sanitized.document;
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return createEmptyDocument();
    }
    throw error;
  }
}

async function writeDocument(filePath: string, document: SummaryStoreDocument): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(document, null, 2);
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await writeFile(tmpPath, serialized, 'utf8');

  try {
    await rename(tmpPath, filePath);
  } catch (error) {
    try {
      await unlink(tmpPath);
    } catch {
      // Best effort temp cleanup.
    }
    throw error;
  }
}

class FileSummaryStore implements SummaryStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly observabilitySink?: SummaryObservabilitySink
  ) {}

  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async getByMessageId(messageId: string): Promise<PersistedEmailSummary | null> {
    return this.withLock(async () => {
      const document = await readDocument(this.filePath, this.observabilitySink);
      return document.summariesByMessageId[messageId] ?? null;
    });
  }

  async upsert(record: PersistedEmailSummary): Promise<void> {
    const uncheckedRecord: unknown = record;
    if (!isValidPersistedSummary(uncheckedRecord)) {
      const candidate = uncheckedRecord as { messageId?: unknown };
      emitSummaryObservabilityEvent(this.observabilitySink, {
        event: 'summary_store_invalid_record_rejected',
        messageIdHint:
          typeof candidate.messageId === 'string' ? redactMessageId(candidate.messageId) : undefined
      });
      throw new Error('Invalid summary record');
    }

    await this.withLock(async () => {
      const document = await readDocument(this.filePath, this.observabilitySink);
      const nextDocument: SummaryStoreDocument = {
        ...document,
        summariesByMessageId: {
          ...document.summariesByMessageId,
          [record.messageId]: record
        }
      };
      await writeDocument(this.filePath, nextDocument);
    });
  }
}

export function createSummaryStore(
  filePath = DEFAULT_SUMMARY_STORE_PATH,
  options: { observabilitySink?: SummaryObservabilitySink } = {}
): SummaryStore {
  return new FileSummaryStore(filePath, options.observabilitySink);
}
