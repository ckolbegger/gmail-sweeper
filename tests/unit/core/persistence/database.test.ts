import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppDatabase } from '../../../../src/core/persistence/database.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('AppDatabase', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'gmail-sweep-test-'));
    dbPath = join(tempDir, 'test.db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should connect to SQLite database file', async () => {
    const db = new AppDatabase({ path: dbPath });
    await db.initialize();
    expect(db.isInitialized()).toBe(true);
    db.close();
  });

  it('should run migrations on first connect', async () => {
    const db = new AppDatabase({ path: dbPath });
    await db.initialize();

    const database = db.getDatabase();
    const result = database.prepare("SELECT value FROM app_metadata WHERE key = 'schema_version'").get() as { value: string };

    expect(result).toBeDefined();
    expect(result.value).toBe('1');
    db.close();
  });

  it('should create all required tables', async () => {
    const db = new AppDatabase({ path: dbPath });
    await db.initialize();

    const database = db.getDatabase();
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('emails');
    expect(tableNames).toContain('labels');
    expect(tableNames).toContain('queries');
    expect(tableNames).toContain('workflows');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('app_metadata');

    db.close();
  });

  it('should handle multiple initialize calls gracefully', async () => {
    const db = new AppDatabase({ path: dbPath });
    await db.initialize();
    await db.initialize(); // Second call should be no-op

    expect(db.isInitialized()).toBe(true);
    db.close();
  });

  it('should throw when accessing database before initialization', () => {
    const db = new AppDatabase({ path: dbPath });
    expect(() => db.getDatabase()).toThrow('Database not initialized');
  });
});
