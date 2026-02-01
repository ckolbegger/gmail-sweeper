/**
 * Database Connection and Migration Runner
 *
 * Manages SQLite connection and schema migrations.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface DatabaseConfig {
  /** Path to SQLite database file */
  path: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DB_PATH = process.env.GMAIL_SWEEP_DB ||
  `${process.env.HOME}/.local/share/gmail-sweep/emails.db`;

// ============================================================================
// Database Class
// ============================================================================

export class AppDatabase {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      path: config.path || DEFAULT_DB_PATH,
      verbose: config.verbose || process.env.NODE_ENV === 'development',
    };
  }

  /**
   * Initialize the database connection and run migrations
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    // Ensure directory exists
    const { mkdirSync } = await import('fs');
    const dbDir = dirname(this.config.path);
    try {
      mkdirSync(dbDir, { recursive: true });
    } catch {
      // Directory may already exist
    }

    // Open database
    this.db = new Database(this.config.path, {
      verbose: this.config.verbose ? console.log : undefined,
    });

    // Enable foreign keys
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Run migrations
    await this.runMigrations();
  }

  /**
   * Get the database instance
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const currentVersion = this.getSchemaVersion();

    if (currentVersion < 1) {
      await this.runMigration('001_initial.sql');
      this.setSchemaVersion(1);
    }

    // Future migrations check version and run sequentially
  }

  /**
   * Run a single migration file
   */
  private async runMigration(filename: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Try to find migration file relative to source or dist
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Check multiple possible locations (src for dev, dist for production)
    const possiblePaths = [
      join(__dirname, 'migrations', filename),
      join(__dirname, '..', '..', '..', 'src', 'core', 'persistence', 'migrations', filename),
      join(process.cwd(), 'src', 'core', 'persistence', 'migrations', filename),
    ];

    let sql: string | null = null;
    for (const path of possiblePaths) {
      try {
        sql = readFileSync(path, 'utf-8');
        break;
      } catch {
        // Try next path
      }
    }

    if (!sql) {
      throw new Error(`Migration file not found: ${filename}`);
    }

    // Run in transaction
    this.db.transaction(() => {
      this.db!.exec(sql!);
    })();
  }

  /**
   * Get current schema version
   */
  private getSchemaVersion(): number {
    if (!this.db) {
      return 0;
    }

    try {
      const result = this.db
        .prepare("SELECT value FROM app_metadata WHERE key = 'schema_version'")
        .get() as { value: string } | undefined;
      return result ? parseInt(result.value, 10) : 0;
    } catch {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Set schema version
   */
  private setSchemaVersion(version: number): void {
    if (!this.db) {
      return;
    }

    this.db
      .prepare(
        "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('schema_version', ?)"
      )
      .run(version.toString());
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultDatabase: AppDatabase | null = null;

/**
 * Get the default database instance (singleton)
 */
export function getDefaultDatabase(): AppDatabase {
  if (!defaultDatabase) {
    defaultDatabase = new AppDatabase();
  }
  return defaultDatabase;
}

/**
 * Reset the default database instance (useful for testing)
 */
export function resetDefaultDatabase(): void {
  if (defaultDatabase) {
    defaultDatabase.close();
    defaultDatabase = null;
  }
}
