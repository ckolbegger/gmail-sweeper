/**
 * Email Repository
 *
 * Handles CRUD operations for emails in the SQLite database.
 */

import type { AppDatabase } from '../persistence/database.js';
import type { Email, PaginatedResult, EmailFilter, SortOptions } from '../contracts/types.js';
import { DatabaseError } from '../errors/index.js';

export interface ListOptions {
  limit?: number;
  offset?: number;
  filter?: EmailFilter;
  sort?: SortOptions;
}

export class EmailRepository {
  constructor(private db: AppDatabase) {}

  /**
   * Save an email to the database (insert or update)
   */
  async save(email: Email): Promise<void> {
    try {
      const database = this.db.getDatabase();

      // Serialize arrays and dates for storage
      const labelsJson = JSON.stringify(email.labels);
      const dateReceived = email.dateReceived.getTime();
      const syncedAt = email.syncedAt.getTime();

      // Use INSERT OR REPLACE (upsert) to handle both insert and update
      const stmt = database.prepare(`
        INSERT OR REPLACE INTO emails (
          id, thread_id, subject, sender_name, sender_email,
          date_received, body_text, body_html, labels, is_read,
          category, snippet, history_id, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        email.id,
        email.threadId,
        email.subject,
        email.sender.name ?? null,
        email.sender.email,
        dateReceived,
        email.body.text,
        email.body.html ?? null,
        labelsJson,
        email.isRead ? 1 : 0,
        email.category ?? null,
        email.snippet,
        email.historyId,
        syncedAt
      );

      // Save recipients if any
      if (email.recipients.length > 0 || email.cc.length > 0 || email.bcc.length > 0) {
        // First delete existing recipients for this email
        const deleteRecipients = database.prepare(
          'DELETE FROM email_recipients WHERE email_id = ?'
        );
        deleteRecipients.run(email.id);

        // Insert new recipients
        const insertRecipient = database.prepare(`
          INSERT INTO email_recipients (email_id, recipient_type, name, email)
          VALUES (?, ?, ?, ?)
        `);

        for (const recipient of email.recipients) {
          insertRecipient.run(email.id, 'to', recipient.name ?? null, recipient.email);
        }

        for (const recipient of email.cc) {
          insertRecipient.run(email.id, 'cc', recipient.name ?? null, recipient.email);
        }

        for (const recipient of email.bcc) {
          insertRecipient.run(email.id, 'bcc', recipient.name ?? null, recipient.email);
        }
      }
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to save email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Retrieve an email by ID
   */
  async getById(id: string): Promise<Email | null> {
    try {
      const database = this.db.getDatabase();

      const row = database.prepare('SELECT * FROM emails WHERE id = ?').get(id) as
        | EmailRow
        | undefined;

      if (!row) {
        return null;
      }

      return this.rowToEmail(row);
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to get email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * List emails with pagination, filtering, and sorting
   */
  async list(options: ListOptions = {}): Promise<PaginatedResult<Email>> {
    try {
      const database = this.db.getDatabase();
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;

      // Build WHERE clause from filters
      const whereConditions: string[] = [];
      const params: (string | number)[] = [];

      if (options.filter) {
        const filter = options.filter;

        if (filter.sender) {
          whereConditions.push('(sender_email LIKE ? OR sender_name LIKE ?)');
          const pattern = `%${filter.sender}%`;
          params.push(pattern, pattern);
        }

        if (filter.dateFrom) {
          whereConditions.push('date_received >= ?');
          params.push(filter.dateFrom.getTime());
        }

        if (filter.dateTo) {
          whereConditions.push('date_received <= ?');
          params.push(filter.dateTo.getTime());
        }

        if (filter.labels && filter.labels.length > 0) {
          // Check if any of the specified labels are in the labels JSON array
          whereConditions.push(
            `(${filter.labels.map(() => 'labels LIKE ?').join(' OR ')})`
          );
          for (const label of filter.labels) {
            params.push(`%"${label}"%`);
          }
        }

        if (filter.isRead !== undefined) {
          whereConditions.push('is_read = ?');
          params.push(filter.isRead ? 1 : 0);
        }

        if (filter.category) {
          whereConditions.push('category = ?');
          params.push(filter.category);
        }

        if (filter.searchText) {
          whereConditions.push(
            '(subject LIKE ? OR body_text LIKE ? OR snippet LIKE ?)'
          );
          const pattern = `%${filter.searchText}%`;
          params.push(pattern, pattern, pattern);
        }
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Build ORDER BY clause
      let orderBy = 'date_received DESC';
      if (options.sort) {
        const field = this.mapSortField(options.sort.field);
        const direction = options.sort.direction === 'asc' ? 'ASC' : 'DESC';
        orderBy = `${field} ${direction}`;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM emails ${whereClause}`;
      const countResult = database.prepare(countQuery).get(...params) as { count: number };
      const total = countResult.count;

      // Get paginated results
      const query = `
        SELECT * FROM emails
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      const rows = database.prepare(query).all(...params, limit, offset) as EmailRow[];

      return {
        items: rows.map(row => this.rowToEmail(row)),
        total,
        offset,
        limit,
        hasMore: offset + rows.length < total,
      };
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to list emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update email read status
   */
  async updateReadStatus(id: string, isRead: boolean): Promise<void> {
    try {
      const database = this.db.getDatabase();

      const result = database
        .prepare('UPDATE emails SET is_read = ? WHERE id = ?')
        .run(isRead ? 1 : 0, id);

      if (result.changes === 0) {
        throw new DatabaseError('NOT_FOUND', `Email with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to update read status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete an email from the database
   */
  async delete(id: string): Promise<void> {
    try {
      const database = this.db.getDatabase();

      // Delete recipients first (cascade should handle this, but be explicit)
      database.prepare('DELETE FROM email_recipients WHERE email_id = ?').run(id);

      // Delete email
      database.prepare('DELETE FROM emails WHERE id = ?').run(id);
    } catch (error) {
      throw new DatabaseError(
        'QUERY_FAILED',
        `Failed to delete email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Map sort field from domain type to database column
   */
  private mapSortField(field: SortOptions['field']): string {
    switch (field) {
      case 'date':
        return 'date_received';
      case 'sender':
        return 'sender_email';
      case 'subject':
        return 'subject';
      default:
        return 'date_received';
    }
  }

  /**
   * Load recipients for an email from the email_recipients table
   */
  private loadRecipients(emailId: string): {
    recipients: Email['recipients'];
    cc: Email['cc'];
    bcc: Email['bcc'];
  } {
    try {
      const database = this.db.getDatabase();
      const rows = database
        .prepare('SELECT * FROM email_recipients WHERE email_id = ?')
        .all(emailId) as RecipientRow[];

      const recipients: Email['recipients'] = [];
      const cc: Email['cc'] = [];
      const bcc: Email['bcc'] = [];

      for (const row of rows) {
        const recipient = {
          name: row.name ?? undefined,
          email: row.email,
        };

        switch (row.recipient_type) {
          case 'to':
            recipients.push(recipient);
            break;
          case 'cc':
            cc.push(recipient);
            break;
          case 'bcc':
            bcc.push(recipient);
            break;
        }
      }

      return { recipients, cc, bcc };
    } catch {
      // If recipients table doesn't exist or fails, return empty arrays
      return { recipients: [], cc: [], bcc: [] };
    }
  }

  /**
   * Convert database row to Email object
   */
  private rowToEmail(row: EmailRow): Email {
    const { recipients, cc, bcc } = this.loadRecipients(row.id);

    return {
      id: row.id,
      threadId: row.thread_id,
      subject: row.subject,
      sender: {
        name: row.sender_name ?? undefined,
        email: row.sender_email,
      },
      recipients,
      cc,
      bcc,
      dateReceived: new Date(row.date_received),
      body: {
        text: row.body_text ?? '',
        html: row.body_html ?? undefined,
      },
      labels: JSON.parse(row.labels) as string[],
      isRead: row.is_read === 1,
      category: (row.category as Email['category']) ?? undefined,
      snippet: row.snippet ?? '',
      historyId: row.history_id ?? '',
      syncedAt: new Date(row.synced_at),
    };
  }
}

// Database row types
interface EmailRow {
  id: string;
  thread_id: string;
  subject: string;
  sender_name: string | null;
  sender_email: string;
  date_received: number;
  body_text: string | null;
  body_html: string | null;
  labels: string;
  is_read: number;
  category: string | null;
  snippet: string | null;
  history_id: string | null;
  synced_at: number;
}

interface RecipientRow {
  id: number;
  email_id: string;
  recipient_type: 'to' | 'cc' | 'bcc';
  name: string | null;
  email: string;
}
