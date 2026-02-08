/**
 * LabelRepository
 *
 * Caches and manages Gmail labels.
 */

import type { AppDatabase } from '../persistence/database.js';
import type { Label } from '../contracts/types.js';
import { DatabaseError } from '../errors/index.js';
import { logger } from '../logging/index.js';

export interface LabelRepository {
  /**
   * Save or update a label
   */
  save(label: Label): Promise<void>;

  /**
   * Get label by ID
   */
  getById(id: string): Promise<Label | null>;

  /**
   * Get label by name
   */
  getByName(name: string): Promise<Label | null>;

  /**
   * List all labels
   */
  list(): Promise<Label[]>;

  /**
   * Delete a label
   */
  delete(id: string): Promise<void>;

  /**
   * Clear all labels
   */
  clear(): Promise<void>;
}

export class LabelRepositoryImpl implements LabelRepository {
  constructor(private db: AppDatabase) {}

  async save(label: Label): Promise<void> {
    try {
      const database = this.db.getDatabase();
      const stmt = database.prepare(`
        INSERT OR REPLACE INTO labels (
          id, name, type, color_bg, color_text, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        label.id,
        label.name,
        label.type,
        label.color?.backgroundColor ?? null,
        label.color?.textColor ?? null,
        label.updatedAt.getTime()
      );

      logger.debug(`Saved label: ${label.name}`);
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to save label: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getById(id: string): Promise<Label | null> {
    try {
      const database = this.db.getDatabase();
      const row = database.prepare('SELECT * FROM labels WHERE id = ?').get(id) as
        | LabelRow
        | undefined;

      return row ? this.rowToLabel(row) : null;
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to get label: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async getByName(name: string): Promise<Label | null> {
    try {
      const database = this.db.getDatabase();
      const row = database.prepare('SELECT * FROM labels WHERE name = ?').get(name) as
        | LabelRow
        | undefined;

      return row ? this.rowToLabel(row) : null;
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to get label by name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async list(): Promise<Label[]> {
    try {
      const database = this.db.getDatabase();
      const rows = database.prepare('SELECT * FROM labels ORDER BY name').all() as LabelRow[];

      return rows.map((row) => this.rowToLabel(row));
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to list labels: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const database = this.db.getDatabase();
      database.prepare('DELETE FROM labels WHERE id = ?').run(id);
      logger.debug(`Deleted label: ${id}`);
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to delete label: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async clear(): Promise<void> {
    try {
      const database = this.db.getDatabase();
      database.prepare('DELETE FROM labels').run();
      logger.debug('Cleared all labels');
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to clear labels: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private rowToLabel(row: LabelRow): Label {
    return {
      id: row.id,
      name: row.name,
      type: row.type as Label['type'],
      color:
        row.color_bg && row.color_text
          ? {
              backgroundColor: row.color_bg,
              textColor: row.color_text,
            }
          : undefined,
      updatedAt: new Date(row.updated_at),
    };
  }
}

interface LabelRow {
  id: string;
  name: string;
  type: string;
  color_bg: string | null;
  color_text: string | null;
  updated_at: number;
}

export function createLabelRepository(db: AppDatabase): LabelRepository {
  return new LabelRepositoryImpl(db);
}
