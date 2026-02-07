import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface DatabaseConfig {
  path: string;
  readonly?: boolean;
}

let _db: Database.Database | null = null;

export function getDatabase(config?: DatabaseConfig): Database.Database {
  if (_db) {
    return _db;
  }

  const dbPath =
    config?.path ?? process.env.DATABASE_PATH ?? process.env.HOME + '/.gmail-sweep/gmail-sweep.db';
  const db = new Database(dbPath, {
    readonly: config?.readonly ?? false,
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  _db = db;
  return db;
}

export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function runMigrations(db: Database.Database): void {
  // Create migrations tracking table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(currentDir, 'migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = db.prepare('SELECT name FROM _migrations').all() as any[];
  const appliedNames = new Set(applied.map((a) => a.name));

  for (const file of migrationFiles) {
    if (!appliedNames.has(file)) {
      const migration = readFileSync(join(migrationsDir, file), 'utf-8');
      db.exec(migration);
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, Date.now());
    }
  }
}

export const database = {
  get: getDatabase,
  close: closeDatabase,
};
