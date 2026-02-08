/**
 * Label Repository
 *
 * Handles label caching and CRUD operations for labels in the local SQLite database.
 */

import Database from 'better-sqlite3';
import type { Label } from '../models/label.js';
import { GmailError } from '../errors/index.js';

export class LabelRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Initialize the labels table
   */
  initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        background_color TEXT,
        text_color TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(type);
      CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(name);
    `);
  }

  /**
   * Cache labels from Gmail
   */
  async cacheLabels(labels: Label[]): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO labels (id, name, type, background_color, text_color, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((labels: Label[]) => {
        for (const label of labels) {
          stmt.run(
            label.id,
            label.name,
            label.type,
            label.color?.backgroundColor || null,
            label.color?.textColor || null,
            label.updatedAt.getTime()
          );
        }
      });

      insertMany(labels);
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to cache labels', error as Error);
    }
  }

  /**
   * Retrieve a label by ID
   */
  async getById(id: string): Promise<Label | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM labels WHERE id = ?');
      const row = stmt.get(id) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToLabel(row);
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to retrieve label', error as Error);
    }
  }

  /**
   * List all labels
   */
  async listAll(): Promise<Label[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM labels ORDER BY type, name');
      const rows = stmt.all() as any[];

      return rows.map(row => this.mapRowToLabel(row));
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to list labels', error as Error);
    }
  }

  /**
   * Sync labels with Gmail API (delegates to caller to fetch from API)
   */
  async syncLabels(labels: Label[]): Promise<void> {
    await this.cacheLabels(labels);
  }

  /**
   * Map a database row to a Label object
   */
  private mapRowToLabel(row: any): Label {
    return {
      id: row.id,
      name: row.name,
      type: row.type as 'system' | 'user',
      color: row.background_color && row.text_color
        ? {
            backgroundColor: row.background_color,
            textColor: row.text_color,
          }
        : undefined,
      updatedAt: new Date(row.updated_at),
    };
  }
}
