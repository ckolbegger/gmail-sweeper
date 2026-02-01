-- Initial Schema Migration
-- Creates tables for emails, queries, workflows, sessions, and labels

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

-- Query table: Saved natural language queries
CREATE TABLE IF NOT EXISTS queries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    natural_language_text TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_run_at INTEGER,
    run_count INTEGER NOT NULL DEFAULT 0
);

-- Workflow table: Query-action pairs
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    query_id TEXT NOT NULL,
    name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_params TEXT NOT NULL,
    execution_order INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE
);

-- Workflow execution log
CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    emails_matched INTEGER NOT NULL DEFAULT 0,
    emails_processed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    error TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session table: Tracks app sessions for sync
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    last_email_check_at INTEGER,
    last_history_id TEXT,
    device_info TEXT
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

-- Application metadata (single row)
CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert schema version
INSERT OR IGNORE INTO app_metadata (key, value) VALUES ('schema_version', '1');
