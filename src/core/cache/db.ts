/**
 * T027-T030: SQLite-based email cache implementation using sql.js.
 * sql.js provides pure JavaScript SQLite without native compilation issues.
 */

// @ts-ignore - sql.js has no TypeScript declarations
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type {
  Email,
  EmailCacheOptions,
} from '../models/index.js';

let SQL: any = null;

/**
 * Initialize sql.js module (lazy initialization)
 */
async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

/**
 * T027: SQLite email cache for local storage of email metadata.
 */
export class EmailCache {
  private db: any;
  private dbPath: string;

  /**
   * T027: Creates a new EmailCache instance.
   * @param dbPath - Path to SQLite database file
   */
  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Ensure database is initialized synchronously
   */
  private ensureInitialized(): void {
    if (this.db === null) {
      this.loadDatabase();
    }
  }

  /**
   * Load database from file or create new
   */
  private loadDatabase(): void {
    if (!SQL) {
      throw new Error('sql.js not initialized. Call initialize() first.');
    }

    if (existsSync(this.dbPath)) {
      try {
        const buffer = readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
      } catch {
        // If file is corrupted, create new database
        this.db = new SQL.Database();
      }
    } else {
      // Create new database
      this.db = new SQL.Database();
    }
  }

  /**
   * Save database to file
   */
  private saveDatabase(): void {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const dir = dirname(this.dbPath);

      // Ensure directory exists
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.dbPath, buffer);
    }
  }

  /**
   * T027: Initializes the database schema asynchronously.
   * Creates tables if they don't exist.
   */
  async initialize(): Promise<void> {
    await initSQL();
    this.loadDatabase();

    // Create emails table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS emails (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        subject TEXT,
        sender_email TEXT NOT NULL,
        sender_name TEXT,
        recipients_json TEXT,
        date TEXT NOT NULL,
        snippet TEXT,
        body_text TEXT,
        body_html TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        is_starred INTEGER NOT NULL DEFAULT 0,
        has_attachments INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        labels_json TEXT,
        cached_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date DESC);
      CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender_email);
      CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
    `);

    // Create sync_state table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sync_state (
        user_email TEXT PRIMARY KEY,
        last_sync TEXT NOT NULL
      );
    `);

    this.saveDatabase();
  }

  /**
   * T028: Inserts or updates emails in the cache.
   * @param emails - Emails to upsert
   */
  upsertEmails(emails: Email[]): void {
    if (emails.length === 0) return;

    this.ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO emails (
        id, thread_id, subject, sender_email, sender_name, recipients_json,
        date, snippet, body_text, body_html, is_read, is_starred,
        has_attachments, category, labels_json, cached_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const now = new Date().toISOString();

    for (const email of emails) {
      stmt.bind([
        email.id,
        email.threadId,
        email.subject ?? null,
        email.sender.email,
        email.sender.name ?? null,
        JSON.stringify(email.recipients),
        email.date.toISOString(),
        email.snippet ?? null,
        email.bodyText ?? null,
        email.bodyHtml ?? null,
        email.isRead ? 1 : 0,
        email.isStarred ? 1 : 0,
        email.hasAttachments ? 1 : 0,
        email.category ?? null,
        email.labels ? JSON.stringify(email.labels) : null,
        now,
      ]);
      stmt.step();
      stmt.reset();
    }

    stmt.free();
    this.saveDatabase();
  }

  /**
   * T029: Retrieves emails from the cache with sorting options.
   * @param options - Query options (limit, offset, sortBy, sortDesc, labelFilter, categoryFilter)
   * @returns Array of emails
   */
  getEmails(options?: Partial<EmailCacheOptions>): Email[] {
    this.ensureInitialized();

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const sortBy = options?.sortBy ?? 'date';
    const sortDesc = options?.sortDesc !== false; // default: true

    let query = 'SELECT * FROM emails WHERE 1=1';
    const params: any[] = [];

    if (options?.labelFilter) {
      query += ' AND labels_json LIKE ?';
      params.push(`%"${options.labelFilter}"%`);
    }

    if (options?.categoryFilter) {
      query += ' AND category = ?';
      params.push(options.categoryFilter);
    }

    // Validate sortBy to prevent SQL injection
    const validSortFields = ['date', 'sender_email', 'subject'];
    const mappedSortBy = sortBy === 'sender' ? 'sender_email' : sortBy;
    const finalSortBy = validSortFields.includes(mappedSortBy) ? mappedSortBy : 'date';

    const sortOrder = sortDesc ? 'DESC' : 'ASC';
    query += ` ORDER BY ${finalSortBy} ${sortOrder}`;

    // If limit is 0, return all (no LIMIT clause)
    if (limit > 0) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const emails: Email[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      emails.push({
        id: row.id,
        threadId: row.thread_id,
        subject: row.subject,
        sender: {
          email: row.sender_email,
          name: row.sender_name,
        },
        recipients: JSON.parse(row.recipients_json),
        date: new Date(row.date),
        snippet: row.snippet,
        bodyText: row.body_text,
        bodyHtml: row.body_html,
        isRead: row.is_read === 1,
        isStarred: row.is_starred === 1,
        hasAttachments: row.has_attachments === 1,
        category: row.category,
        labels: row.labels_json ? JSON.parse(row.labels_json) : [],
      });
    }

    stmt.free();
    return emails;
  }

  /**
   * T030: Gets the last sync timestamp for a user.
   * @param userEmail - User email address
   * @returns Last sync timestamp or null if never synced
   */
  getLastSync(userEmail: string): Date | null {
    this.ensureInitialized();

    const stmt = this.db.prepare(
      'SELECT last_sync FROM sync_state WHERE user_email = ?'
    );
    stmt.bind([userEmail]);

    let lastSync: Date | null = null;

    if (stmt.step()) {
      const row = stmt.getAsObject();
      lastSync = new Date(row.last_sync);
    }

    stmt.free();
    return lastSync;
  }

  /**
   * T030: Sets the last sync timestamp for a user.
   * @param userEmail - User email address
   * @param syncTime - Sync timestamp
   */
  setLastSync(userEmail: string, syncTime: Date = new Date()): void {
    this.ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sync_state (user_email, last_sync)
      VALUES (?, ?)
    `);

    stmt.bind([userEmail, syncTime.toISOString()]);
    stmt.step();
    stmt.free();

    this.saveDatabase();
  }

  /**
   * Removes a single email from the cache by id.
   * @param id - Gmail message ID to remove
   */
  removeEmail(id: string): void {
    this.ensureInitialized();
    this.db.run('DELETE FROM emails WHERE id = ?', [id]);
    this.saveDatabase();
  }

  /**
   * Close database connection and save changes
   */
  close(): void {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.db = null;
    }
  }
}
