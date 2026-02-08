/**
 * Email List Integration Tests
 *
 * Tests the complete flow from Gmail API to database to repository.
 * Verifies sync functionality, progress tracking, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppDatabase } from '../../src/core/persistence/database.js';
import type {
  Email,
  GmailClient,
  AuthManager,
  EmailListOptions,
  PaginatedResult,
  SyncProgress,
  SyncResult,
  AuthCredentials,
} from '../../src/core/contracts/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestEmail(overrides: Partial<Email> = {}): Email {
  const now = new Date();
  return {
    id: `msg_${Math.random().toString(36).substring(2, 11)}`,
    threadId: `thread_${Math.random().toString(36).substring(2, 11)}`,
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ name: 'Test Recipient', email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: now,
    body: { text: 'Test body content' },
    labels: ['INBOX', 'UNREAD'],
    isRead: false,
    snippet: 'Test snippet...',
    historyId: '12345',
    syncedAt: now,
    ...overrides,
  };
}

// ============================================================================
// Mock Gmail Client
// ============================================================================

class MockAuthManager implements AuthManager {
  private authenticated = true;
  private credentials: AuthCredentials = {
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    expiryDate: Date.now() + 3600000,
  };
  private tokenRefreshHandlers: Array<(credentials: AuthCredentials) => void> = [];

  async isAuthenticated(): Promise<boolean> {
    return this.authenticated;
  }

  async getAuthUrl(): Promise<string> {
    return 'https://accounts.google.com/oauth/mock';
  }

  async exchangeCode(_code: string): Promise<AuthCredentials> {
    return this.credentials;
  }

  async getAccessToken(): Promise<string> {
    return this.credentials.accessToken;
  }

  async revokeAuth(): Promise<void> {
    this.authenticated = false;
  }

  onTokenRefresh(handler: (credentials: AuthCredentials) => void): void {
    this.tokenRefreshHandlers.push(handler);
  }

  triggerTokenRefresh(credentials: AuthCredentials): void {
    this.tokenRefreshHandlers.forEach(handler => handler(credentials));
  }
}

class MockGmailClient implements GmailClient {
  readonly auth: AuthManager;
  private emails: Map<string, Email> = new Map();
  private shouldFailSync = false;
  private syncDelayMs = 0;
  private progressCallbacks: Array<(progress: SyncProgress) => void> = [];
  private currentHistoryId = '1000';

  constructor() {
    this.auth = new MockAuthManager();
  }

  // Test control methods
  addEmails(emails: Email[]): void {
    emails.forEach(email => this.emails.set(email.id, email));
  }

  setSyncFailure(shouldFail: boolean): void {
    this.shouldFailSync = shouldFail;
  }

  setSyncDelay(ms: number): void {
    this.syncDelayMs = ms;
  }

  updateEmail(id: string, updates: Partial<Email>): void {
    const email = this.emails.get(id);
    if (email) {
      this.emails.set(id, { ...email, ...updates });
    }
  }

  clearEmails(): void {
    this.emails.clear();
  }

  // GmailClient implementation
  async listEmails(options: EmailListOptions): Promise<PaginatedResult<Email>> {
    const allEmails = Array.from(this.emails.values());
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    let filtered = allEmails;

    // Apply filters
    if (options.filter) {
      if (options.filter.sender) {
        filtered = filtered.filter(e => e.sender.email.includes(options.filter!.sender!));
      }
      if (options.filter.isRead !== undefined) {
        filtered = filtered.filter(e => e.isRead === options.filter!.isRead);
      }
      if (options.filter.labels) {
        filtered = filtered.filter(e =>
          options.filter!.labels!.some(label => e.labels.includes(label))
        );
      }
    }

    // Apply sorting
    if (options.sort) {
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (options.sort!.field) {
          case 'date':
            comparison = a.dateReceived.getTime() - b.dateReceived.getTime();
            break;
          case 'sender':
            comparison = a.sender.email.localeCompare(b.sender.email);
            break;
          case 'subject':
            comparison = a.subject.localeCompare(b.subject);
            break;
        }
        return options.sort!.direction === 'desc' ? -comparison : comparison;
      });
    }

    const items = filtered.slice(offset, offset + limit);
    const total = filtered.length;

    return {
      items,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  }

  async getEmail(id: string): Promise<Email | null> {
    return this.emails.get(id) ?? null;
  }

  async getEmails(ids: string[]): Promise<Email[]> {
    return ids.map(id => this.emails.get(id)).filter((e): e is Email => e !== undefined);
  }

  async getEmailContent(id: string): Promise<Email | null> {
    return this.getEmail(id);
  }

  async fullSync(options: {
    batchSize?: number;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult> {
    if (this.shouldFailSync) {
      return {
        success: false,
        emailsAdded: 0,
        emailsUpdated: 0,
        emailsDeleted: 0,
        historyId: this.currentHistoryId,
        error: 'Sync failed: Network error',
      };
    }

    const emails = Array.from(this.emails.values());
    const batchSize = options.batchSize ?? 100;
    const total = emails.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const progress: SyncProgress = {
        total,
        processed: Math.min(i + batch.length, total),
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
      };

      if (options.onProgress) {
        options.onProgress(progress);
      }

      if (this.syncDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.syncDelayMs));
      }
    }

    this.currentHistoryId = (parseInt(this.currentHistoryId) + 1).toString();

    return {
      success: true,
      emailsAdded: total,
      emailsUpdated: 0,
      emailsDeleted: 0,
      historyId: this.currentHistoryId,
    };
  }

  async incrementalSync(options: {
    historyId: string;
    onProgress?: (progress: SyncProgress) => void;
  }): Promise<SyncResult> {
    if (this.shouldFailSync) {
      return {
        success: false,
        emailsAdded: 0,
        emailsUpdated: 0,
        emailsDeleted: 0,
        historyId: options.historyId,
        error: 'Incremental sync failed: Network error',
      };
    }

    // Simulate incremental changes
    const emails = Array.from(this.emails.values());
    const newEmails = emails.filter(e => parseInt(e.historyId) > parseInt(options.historyId));

    if (options.onProgress && newEmails.length > 0) {
      options.onProgress({
        total: newEmails.length,
        processed: newEmails.length,
        batchNumber: 1,
        batchSize: newEmails.length,
      });
    }

    this.currentHistoryId = (parseInt(this.currentHistoryId) + 1).toString();

    return {
      success: true,
      emailsAdded: newEmails.length,
      emailsUpdated: 0,
      emailsDeleted: 0,
      historyId: this.currentHistoryId,
    };
  }

  async getCurrentHistoryId(): Promise<string> {
    return this.currentHistoryId;
  }

  async labelEmails(): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return { success: true, successfulCount: 0, failedCount: 0, failures: [] };
  }

  async removeLabel(): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return { success: true, successfulCount: 0, failedCount: 0, failures: [] };
  }

  async archiveEmails(): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return { success: true, successfulCount: 0, failedCount: 0, failures: [] };
  }

  async deleteEmails(): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return { success: true, successfulCount: 0, failedCount: 0, failures: [] };
  }

  async markAsRead(): Promise<{ success: boolean; successfulCount: number; failedCount: number; failures: Array<{ emailId: string; error: string }> }> {
    return { success: true, successfulCount: 0, failedCount: 0, failures: [] };
  }
}

// ============================================================================
// Email Repository
// ============================================================================

interface EmailRepository {
  save(email: Email): void;
  saveMany(emails: Email[]): void;
  findById(id: string): Email | null;
  findAll(options?: { limit?: number; offset?: number }): Email[];
  findByLabel(label: string): Email[];
  update(email: Email): void;
  delete(id: string): void;
  count(): number;
  clear(): void;
}

class SqliteEmailRepository implements EmailRepository {
  constructor(private db: AppDatabase) {}

  save(email: Email): void {
    const database = this.db.getDatabase();
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
      email.dateReceived.getTime(),
      email.body.text,
      email.body.html ?? null,
      JSON.stringify(email.labels),
      email.isRead ? 1 : 0,
      email.category ?? null,
      email.snippet,
      email.historyId,
      email.syncedAt.getTime()
    );

    // Save recipients
    this.saveRecipients(email.id, email.recipients, 'to');
    this.saveRecipients(email.id, email.cc, 'cc');
    this.saveRecipients(email.id, email.bcc, 'bcc');
  }

  private saveRecipients(emailId: string, recipients: Array<{ name?: string; email: string }>, type: string): void {
    const database = this.db.getDatabase();
    const stmt = database.prepare(`
      INSERT INTO email_recipients (email_id, recipient_type, name, email)
      VALUES (?, ?, ?, ?)
    `);

    // First delete existing recipients of this type
    database.prepare('DELETE FROM email_recipients WHERE email_id = ? AND recipient_type = ?').run(emailId, type);

    // Insert new recipients
    for (const recipient of recipients) {
      stmt.run(emailId, type, recipient.name ?? null, recipient.email);
    }
  }

  saveMany(emails: Email[]): void {
    for (const email of emails) {
      this.save(email);
    }
  }

  findById(id: string): Email | null {
    const database = this.db.getDatabase();
    const row = database.prepare('SELECT * FROM emails WHERE id = ?').get(id) as
      | {
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
          snippet: string;
          history_id: string | null;
          synced_at: number;
        }
      | undefined;

    if (!row) return null;

    return this.rowToEmail(row);
  }

  findAll(options?: { limit?: number; offset?: number }): Email[] {
    const database = this.db.getDatabase();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const rows = database
      .prepare('SELECT * FROM emails ORDER BY date_received DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Array<{
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
      snippet: string;
      history_id: string | null;
      synced_at: number;
    }>;

    return rows.map(row => this.rowToEmail(row));
  }

  findByLabel(label: string): Email[] {
    const database = this.db.getDatabase();
    const rows = database
      .prepare('SELECT * FROM emails WHERE labels LIKE ? ORDER BY date_received DESC')
      .all(`%${label}%`) as Array<{
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
      snippet: string;
      history_id: string | null;
      synced_at: number;
    }>;

    return rows
      .filter(row => {
        const labels = JSON.parse(row.labels) as string[];
        return labels.includes(label);
      })
      .map(row => this.rowToEmail(row));
  }

  update(email: Email): void {
    this.save(email);
  }

  delete(id: string): void {
    const database = this.db.getDatabase();
    database.prepare('DELETE FROM emails WHERE id = ?').run(id);
  }

  count(): number {
    const database = this.db.getDatabase();
    const result = database.prepare('SELECT COUNT(*) as count FROM emails').get() as { count: number };
    return result.count;
  }

  clear(): void {
    const database = this.db.getDatabase();
    database.prepare('DELETE FROM emails').run();
    database.prepare('DELETE FROM email_recipients').run();
  }

  private rowToEmail(row: {
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
    snippet: string;
    history_id: string | null;
    synced_at: number;
  }): Email {
    return {
      id: row.id,
      threadId: row.thread_id,
      subject: row.subject,
      sender: {
        name: row.sender_name ?? undefined,
        email: row.sender_email,
      },
      recipients: [], // Simplified for tests
      cc: [],
      bcc: [],
      dateReceived: new Date(row.date_received),
      body: {
        text: row.body_text ?? '',
        html: row.body_html ?? undefined,
      },
      labels: JSON.parse(row.labels) as string[],
      isRead: row.is_read === 1,
      category: (row.category as Email['category']) ?? undefined,
      snippet: row.snippet,
      historyId: row.history_id ?? '',
      syncedAt: new Date(row.synced_at),
    };
  }
}

// ============================================================================
// Sync Service
// ============================================================================

interface SyncService {
  sync(): Promise<SyncResult>;
  onProgress(callback: (progress: SyncProgress) => void): void;
  getLastSyncResult(): SyncResult | null;
}

class EmailSyncService implements SyncService {
  private progressCallbacks: Array<(progress: SyncProgress) => void> = [];
  private lastSyncResult: SyncResult | null = null;

  constructor(
    private gmailClient: GmailClient,
    private emailRepository: EmailRepository
  ) {}

  async sync(): Promise<SyncResult> {
    const result = await this.gmailClient.fullSync({
      onProgress: (progress) => {
        this.progressCallbacks.forEach(cb => cb(progress));
      },
    });

    if (result.success) {
      // Fetch all emails from Gmail and save to repository
      const paginated = await this.gmailClient.listEmails({ limit: 10000 });
      this.emailRepository.saveMany(paginated.items);
    }

    this.lastSyncResult = result;
    return result;
  }

  onProgress(callback: (progress: SyncProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult;
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Email List Integration', () => {
  let tempDir: string;
  let dbPath: string;
  let database: AppDatabase;
  let gmailClient: MockGmailClient;
  let emailRepository: EmailRepository;
  let syncService: SyncService;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gmail-sweep-integration-'));
    dbPath = join(tempDir, 'test.db');

    database = new AppDatabase({ path: dbPath });
    await database.initialize();

    gmailClient = new MockGmailClient();
    emailRepository = new SqliteEmailRepository(database);
    syncService = new EmailSyncService(gmailClient, emailRepository);
  });

  afterEach(() => {
    database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  // ============================================================================
  // T025: Trigger sync on app start
  // ============================================================================

  describe('sync on app start', () => {
    it('should trigger sync on app start', async () => {
      // Arrange: Set up Gmail with some emails
      const testEmails = [
        createTestEmail({ id: 'msg_1', subject: 'Email 1' }),
        createTestEmail({ id: 'msg_2', subject: 'Email 2' }),
      ];
      gmailClient.addEmails(testEmails);

      // Act: Trigger sync (simulating app start)
      const result = await syncService.sync();

      // Assert: Sync completed successfully
      expect(result.success).toBe(true);
      expect(result.emailsAdded).toBe(2);
      expect(emailRepository.count()).toBe(2);
    });

    it('should handle empty inbox on sync', async () => {
      // Act: Sync with no emails
      const result = await syncService.sync();

      // Assert
      expect(result.success).toBe(true);
      expect(result.emailsAdded).toBe(0);
      expect(emailRepository.count()).toBe(0);
    });
  });

  // ============================================================================
  // T025: Display progress during sync
  // ============================================================================

  describe('sync progress', () => {
    it('should display progress during sync', async () => {
      // Arrange: Create many emails to trigger batching
      const emails: Email[] = [];
      for (let i = 0; i < 250; i++) {
        emails.push(createTestEmail({ id: `msg_${i}`, historyId: i.toString() }));
      }
      gmailClient.addEmails(emails);

      const progressUpdates: SyncProgress[] = [];
      syncService.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      // Act
      await syncService.sync();

      // Assert: Progress was reported
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].total).toBe(250);
      expect(progressUpdates[progressUpdates.length - 1].processed).toBe(250);
    });

    it('should report correct batch information', async () => {
      // Arrange: Create emails that will be processed in multiple batches
      const emails: Email[] = [];
      for (let i = 0; i < 150; i++) {
        emails.push(createTestEmail({ id: `msg_${i}` }));
      }
      gmailClient.addEmails(emails);

      const progressUpdates: SyncProgress[] = [];
      syncService.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      // Act
      await syncService.sync();

      // Assert: Multiple batches were processed
      expect(progressUpdates.length).toBeGreaterThan(1);
      expect(progressUpdates[0].batchNumber).toBe(1);
      expect(progressUpdates[0].batchSize).toBe(100); // Default batch size
    });
  });

  // ============================================================================
  // T025: Show emails after sync completes
  // ============================================================================

  describe('show emails after sync', () => {
    it('should show emails after sync completes', async () => {
      // Arrange
      const testEmails = [
        createTestEmail({ id: 'msg_1', subject: 'Important Email' }),
        createTestEmail({ id: 'msg_2', subject: 'Another Email' }),
      ];
      gmailClient.addEmails(testEmails);

      // Act: Sync
      await syncService.sync();

      // Assert: Emails are available in repository
      const emails = emailRepository.findAll();
      expect(emails).toHaveLength(2);
      expect(emails.map(e => e.subject)).toContain('Important Email');
      expect(emails.map(e => e.subject)).toContain('Another Email');
    });

    it('should show emails in descending date order by default', async () => {
      // Arrange
      const oldEmail = createTestEmail({
        id: 'msg_old',
        subject: 'Old Email',
        dateReceived: new Date('2024-01-01'),
      });
      const newEmail = createTestEmail({
        id: 'msg_new',
        subject: 'New Email',
        dateReceived: new Date('2024-06-01'),
      });
      gmailClient.addEmails([oldEmail, newEmail]);

      // Act
      await syncService.sync();

      // Assert
      const emails = emailRepository.findAll();
      expect(emails[0].subject).toBe('New Email');
      expect(emails[1].subject).toBe('Old Email');
    });
  });

  // ============================================================================
  // T039: Handle sync errors gracefully
  // ============================================================================

  describe('sync error handling', () => {
    it('should handle sync errors gracefully', async () => {
      // Arrange: Configure client to fail
      gmailClient.setSyncFailure(true);

      // Act
      const result = await syncService.sync();

      // Assert: Error is reported without throwing
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(emailRepository.count()).toBe(0);
    });

    it('should preserve last successful sync result after failure', async () => {
      // Arrange: First sync succeeds
      gmailClient.addEmails([createTestEmail({ id: 'msg_1' })]);
      await syncService.sync();

      // Act: Second sync fails
      gmailClient.setSyncFailure(true);
      await syncService.sync();

      // Assert: Previous emails are still available
      expect(emailRepository.count()).toBe(1);
      expect(emailRepository.findById('msg_1')).not.toBeNull();
    });

    it('should allow retry after sync failure', async () => {
      // Arrange: First sync fails
      gmailClient.setSyncFailure(true);
      await syncService.sync();

      // Act: Fix the issue and retry
      gmailClient.setSyncFailure(false);
      gmailClient.addEmails([createTestEmail({ id: 'msg_retry' })]);
      const result = await syncService.sync();

      // Assert: Retry succeeds
      expect(result.success).toBe(true);
      expect(emailRepository.count()).toBe(1);
    });
  });

  // ============================================================================
  // Additional: List emails from local database after sync
  // ============================================================================

  describe('list from local database', () => {
    it('should list emails from local database after sync', async () => {
      // Arrange
      const testEmails = [
        createTestEmail({ id: 'msg_1', subject: 'First' }),
        createTestEmail({ id: 'msg_2', subject: 'Second' }),
        createTestEmail({ id: 'msg_3', subject: 'Third' }),
      ];
      gmailClient.addEmails(testEmails);
      await syncService.sync();

      // Act: Query from local repository
      const allEmails = emailRepository.findAll();
      const byId = emailRepository.findById('msg_2');

      // Assert
      expect(allEmails).toHaveLength(3);
      expect(byId?.subject).toBe('Second');
    });

    it('should support pagination from local database', async () => {
      // Arrange
      const emails: Email[] = [];
      for (let i = 0; i < 10; i++) {
        emails.push(createTestEmail({ id: `msg_${i}`, subject: `Email ${i}` }));
      }
      gmailClient.addEmails(emails);
      await syncService.sync();

      // Act
      const page1 = emailRepository.findAll({ limit: 5, offset: 0 });
      const page2 = emailRepository.findAll({ limit: 5, offset: 5 });

      // Assert
      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should find emails by label from local database', async () => {
      // Arrange
      const inboxEmail = createTestEmail({
        id: 'msg_inbox',
        labels: ['INBOX', 'UNREAD'],
      });
      const sentEmail = createTestEmail({
        id: 'msg_sent',
        labels: ['SENT'],
      });
      gmailClient.addEmails([inboxEmail, sentEmail]);
      await syncService.sync();

      // Act
      const inboxEmails = emailRepository.findByLabel('INBOX');

      // Assert
      expect(inboxEmails).toHaveLength(1);
      expect(inboxEmails[0].id).toBe('msg_inbox');
    });
  });

  // ============================================================================
  // Additional: Sync new emails from Gmail
  // ============================================================================

  describe('sync new emails from Gmail', () => {
    it('should sync new emails from Gmail', async () => {
      // Arrange: Initial sync
      gmailClient.addEmails([createTestEmail({ id: 'msg_1' })]);
      await syncService.sync();
      expect(emailRepository.count()).toBe(1);

      // Act: Add new emails and sync again
      gmailClient.addEmails([
        createTestEmail({ id: 'msg_2' }),
        createTestEmail({ id: 'msg_3' }),
      ]);
      const result = await syncService.sync();

      // Assert
      expect(result.success).toBe(true);
      expect(result.emailsAdded).toBe(3); // All emails from Gmail
      expect(emailRepository.count()).toBe(3);
    });

    it('should not duplicate emails on re-sync', async () => {
      // Arrange
      const email = createTestEmail({ id: 'msg_unique' });
      gmailClient.addEmails([email]);

      // Act: Sync twice
      await syncService.sync();
      await syncService.sync();

      // Assert
      expect(emailRepository.count()).toBe(1);
      expect(emailRepository.findById('msg_unique')).not.toBeNull();
    });

    it('should sync large batches of new emails', async () => {
      // Arrange
      const emails: Email[] = [];
      for (let i = 0; i < 500; i++) {
        emails.push(createTestEmail({ id: `batch_msg_${i}` }));
      }
      gmailClient.addEmails(emails);

      // Act
      const result = await syncService.sync();

      // Assert
      expect(result.success).toBe(true);
      expect(emailRepository.count()).toBe(500);
    });
  });

  // ============================================================================
  // Additional: Update existing emails on sync
  // ============================================================================

  describe('update existing emails on sync', () => {
    it('should update existing emails on sync', async () => {
      // Arrange: Initial sync
      const originalEmail = createTestEmail({
        id: 'msg_update',
        subject: 'Original Subject',
        isRead: false,
      });
      gmailClient.addEmails([originalEmail]);
      await syncService.sync();

      // Act: Modify email in Gmail and re-sync
      gmailClient.updateEmail('msg_update', {
        subject: 'Updated Subject',
        isRead: true,
      });
      await syncService.sync();

      // Assert
      const updated = emailRepository.findById('msg_update');
      expect(updated?.subject).toBe('Updated Subject');
      expect(updated?.isRead).toBe(true);
    });

    it('should update email labels on sync', async () => {
      // Arrange
      const email = createTestEmail({
        id: 'msg_labels',
        labels: ['INBOX', 'UNREAD'],
      });
      gmailClient.addEmails([email]);
      await syncService.sync();

      // Act: Update labels and re-sync
      gmailClient.updateEmail('msg_labels', {
        labels: ['INBOX', 'STARRED'],
      });
      await syncService.sync();

      // Assert
      const updated = emailRepository.findById('msg_labels');
      expect(updated?.labels).toContain('STARRED');
      expect(updated?.labels).not.toContain('UNREAD');
    });

    it('should track sync timestamp on updates', async () => {
      // Arrange
      const beforeSync = new Date();
      const email = createTestEmail({ id: 'msg_timestamp' });
      gmailClient.addEmails([email]);
      await syncService.sync();

      // Act: Wait a bit and re-sync with changes
      await new Promise(resolve => setTimeout(resolve, 10));
      gmailClient.updateEmail('msg_timestamp', { subject: 'Updated' });
      await syncService.sync();

      // Assert
      const updated = emailRepository.findById('msg_timestamp');
      expect(updated?.syncedAt.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
    });
  });
});
