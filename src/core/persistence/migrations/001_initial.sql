-- Gmail Sweep Initial Schema
-- Version: 1

-- Email table: Stores synchronized Gmail messages
CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    sender_name TEXT,
    sender_email TEXT NOT NULL,
    date_received INTEGER NOT NULL,
    body_text TEXT,
    body_html TEXT,
    labels TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    snippet TEXT,
    history_id TEXT,
    synced_at INTEGER NOT NULL
);

-- Email recipients (normalized for query efficiency)
CREATE TABLE IF NOT EXISTS email_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    name TEXT,
    email TEXT NOT NULL,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

-- Label cache: Gmail labels for reference
CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    color_bg TEXT,
    color_text TEXT,
    updated_at INTEGER NOT NULL
);

-- Application metadata
CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert schema version
INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('schema_version', '1');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date_received DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_history ON emails(history_id);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
    subject,
    body_text,
    snippet,
    content='emails',
    content_rowid='rowid'
);

-- Triggers for FTS sync
CREATE TRIGGER IF NOT EXISTS emails_fts_insert AFTER INSERT ON emails BEGIN
    INSERT INTO emails_fts(rowid, subject, body_text, snippet)
    VALUES (new.rowid, new.subject, new.body_text, new.snippet);
END;

CREATE TRIGGER IF NOT EXISTS emails_fts_delete AFTER DELETE ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, body_text, snippet)
    VALUES ('delete', old.rowid, old.subject, old.body_text, old.snippet);
END;

CREATE TRIGGER IF NOT EXISTS emails_fts_update AFTER UPDATE ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, body_text, snippet)
    VALUES ('delete', old.rowid, old.subject, old.body_text, old.snippet);
    INSERT INTO emails_fts(rowid, subject, body_text, snippet)
    VALUES (new.rowid, new.subject, new.body_text, new.snippet);
END;

-- Recipient lookups
CREATE INDEX IF NOT EXISTS idx_recipients_email ON email_recipients(email);
CREATE INDEX IF NOT EXISTS idx_recipients_email_id ON email_recipients(email_id);
