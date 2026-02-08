/**
 * Email Repository
 *
 * Handles CRUD operations for emails in the local SQLite database.
 */

import Database from 'better-sqlite3';
import type { Email } from '../models/email.js';
import { GmailError } from '../errors/index.js';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class EmailRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Save an email to the database
   */
  async save(email: Email): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO emails (
          id, thread_id, subject, sender_name, sender_email,
          recipients, cc, bcc, date_received, body_text, body_html,
          labels, is_read, category, snippet, history_id, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const recipientsJson = JSON.stringify(email.recipients);
      const ccJson = JSON.stringify(email.cc);
      const bccJson = JSON.stringify(email.bcc);
      const labelsJson = JSON.stringify(email.labels);
      const isRead = email.isRead ? 1 : 0;
      const dateReceived = email.dateReceived.getTime();
      const syncedAt = email.syncedAt.getTime();

      stmt.run(
        email.id,
        email.threadId,
        email.subject,
        email.sender.name || null,
        email.sender.email,
        recipientsJson,
        ccJson,
        bccJson,
        dateReceived,
        email.body.text,
        email.body.html || null,
        labelsJson,
        isRead,
        email.category || null,
        email.snippet,
        email.historyId,
        syncedAt
      );
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to save email', error as Error);
    }
  }

  /**
   * Retrieve an email by ID
   */
  async getById(id: string): Promise<Email | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM emails WHERE id = ?');
      const row = stmt.get(id) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToEmail(row);
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to retrieve email', error as Error);
    }
  }

  /**
   * List emails with pagination
   */
  async list(params: PaginationParams): Promise<PaginatedResult<Email>> {
    try {
      const { page, pageSize } = params;
      const offset = (page - 1) * pageSize;

      // Get total count
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM emails');
      const countResult = countStmt.get() as { count: number };
      const total = countResult.count;

      // Get paginated emails
      const stmt = this.db.prepare(`
        SELECT * FROM emails
        ORDER BY date_received DESC
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(pageSize, offset) as any[];

      const items = rows.map(row => this.mapRowToEmail(row));

      return {
        items,
        total,
        page,
        pageSize,
      };
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to list emails', error as Error);
    }
  }

  /**
   * Update the read status of an email
   */
  async updateReadStatus(id: string, isRead: boolean): Promise<void> {
    try {
      const stmt = this.db.prepare('UPDATE emails SET is_read = ? WHERE id = ?');
      stmt.run(isRead ? 1 : 0, id);
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to update read status', error as Error);
    }
  }

  /**
   * Delete an email from the database
   */
  async delete(id: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM emails WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      throw new GmailError('INVALID_REQUEST', 'Failed to delete email', error as Error);
    }
  }

  /**
   * Map a database row to an Email object
   */
  private mapRowToEmail(row: any): Email {
    return {
      id: row.id,
      threadId: row.thread_id,
      subject: row.subject,
      sender: {
        name: row.sender_name,
        email: row.sender_email,
      },
      recipients: JSON.parse(row.recipients || '[]'),
      cc: JSON.parse(row.cc || '[]'),
      bcc: JSON.parse(row.bcc || '[]'),
      dateReceived: new Date(row.date_received),
      body: {
        text: row.body_text,
        html: row.body_html,
      },
      labels: JSON.parse(row.labels || '[]'),
      isRead: row.is_read === 1,
      category: row.category,
      snippet: row.snippet,
      historyId: row.history_id,
      syncedAt: new Date(row.synced_at),
    };
  }
}
