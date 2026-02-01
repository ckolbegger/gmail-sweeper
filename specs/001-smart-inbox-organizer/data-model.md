# Data Model: Smart Inbox Organizer

**Date**: 2026-02-01
**Branch**: `kimi`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Entities

### Email

Represents a Gmail message synchronized to local storage.

```typescript
interface Email {
  id: string;                    // Gmail message ID (primary key)
  threadId: string;              // Gmail thread ID
  subject: string;               // Email subject line
  sender: EmailAddress;          // From address
  recipients: EmailAddress[];    // To addresses
  cc: EmailAddress[];            // CC addresses
  bcc: EmailAddress[];           // BCC addresses (if available)
  dateReceived: Date;            // Received timestamp
  body: EmailBody;               // Plain text and HTML content
  labels: string[];              // Gmail label IDs
  isRead: boolean;               // Read status
  category?: GmailCategory;      // Gmail category (if classified)
  snippet: string;               // Brief preview text
  historyId: string;             // Gmail history ID for sync
  syncedAt: Date;                // Last sync timestamp
}

interface EmailAddress {
  name?: string;                 // Display name
  email: string;                 // Email address
}

interface EmailBody {
  text: string;                  // Plain text content
  html?: string;                 // HTML content (if available)
}

type GmailCategory = 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
```

### Query

Represents a saved natural language search query.

```typescript
interface Query {
  id: string;                    // UUID (primary key)
  name: string;                  // User-friendly name
  naturalLanguageText: string;   // The NL query (e.g., "financial offers")
  description?: string;          // Optional description
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
  lastRunAt?: Date;              // Last execution timestamp
  runCount: number;              // Number of times executed
}
```

### Workflow

Represents a query-action pair that can be executed automatically.

```typescript
interface Workflow {
  id: string;                    // UUID (primary key)
  queryId: string;               // Foreign key to Query
  name: string;                  // Display name (defaults to Query name)
  action: WorkflowAction;        // Action to perform on matches
  executionOrder: number;        // Order in workflow chain (default: 0)
  isEnabled: boolean;            // Whether to run automatically
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}

type WorkflowAction =
  | { type: 'LABEL'; params: { labelId: string; labelName: string } }
  | { type: 'ARCHIVE'; params: {} }
  | { type: 'DELETE'; params: {} };

interface WorkflowExecution {
  id: string;                    // UUID (primary key)
  workflowId: string;            // Foreign key to Workflow
  sessionId: string;             // Foreign key to Session
  startedAt: Date;               // Execution start time
  completedAt?: Date;            // Execution end time
  emailsMatched: number;         // Number of emails matching query
  emailsProcessed: number;       // Number of emails action applied to
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;                // Error message if failed
}
```

### Session

Represents a user session for tracking sync state.

```typescript
interface Session {
  id: string;                    // UUID (primary key)
  startedAt: Date;               // Session start time
  endedAt?: Date;                // Session end time
  lastEmailCheckAt?: Date;       // Last time emails were checked
  lastHistoryId?: string;        // Gmail history ID at last sync
  deviceInfo?: string;           // Optional device identifier
}
```

### Label Mapping

Maps Gmail label IDs to local cache for quick reference.

```typescript
interface Label {
  id: string;                    // Gmail label ID (primary key)
  name: string;                  // Label name
  type: 'system' | 'user';       // System label or user-created
  color?: LabelColor;            // Label color if set
  updatedAt: Date;               // Last sync timestamp
}

interface LabelColor {
  backgroundColor: string;       // Hex color code
  textColor: string;             // Hex color code
}
```

---

## SQLite Schema

```sql
-- Email table: Stores synchronized Gmail messages
CREATE TABLE emails (
    id TEXT PRIMARY KEY,                    -- Gmail message ID
    thread_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    sender_name TEXT,
    sender_email TEXT NOT NULL,
    date_received INTEGER NOT NULL,         -- Unix timestamp (ms)
    body_text TEXT,
    body_html TEXT,
    labels TEXT NOT NULL,                   -- JSON array of label IDs
    is_read INTEGER NOT NULL DEFAULT 0,     -- Boolean (0/1)
    category TEXT,                          -- Gmail category
    snippet TEXT,
    history_id TEXT,
    synced_at INTEGER NOT NULL              -- Unix timestamp (ms)
);

-- Email recipients (normalized for query efficiency)
CREATE TABLE email_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT NOT NULL,
    recipient_type TEXT NOT NULL,           -- 'to', 'cc', 'bcc'
    name TEXT,
    email TEXT NOT NULL,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

-- Query table: Saved natural language queries
CREATE TABLE queries (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,
    natural_language_text TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    updated_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    last_run_at INTEGER,                    -- Unix timestamp (ms)
    run_count INTEGER NOT NULL DEFAULT 0
);

-- Workflow table: Query-action pairs
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,                    -- UUID
    query_id TEXT NOT NULL,
    name TEXT NOT NULL,
    action_type TEXT NOT NULL,              -- 'LABEL', 'ARCHIVE', 'DELETE'
    action_params TEXT NOT NULL,            -- JSON object
    execution_order INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,  -- Boolean (0/1)
    created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    updated_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE
);

-- Workflow execution log
CREATE TABLE workflow_executions (
    id TEXT PRIMARY KEY,                    -- UUID
    workflow_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    completed_at INTEGER,                   -- Unix timestamp (ms)
    emails_matched INTEGER NOT NULL DEFAULT 0,
    emails_processed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,                   -- 'running', 'completed', 'failed', 'cancelled'
    error TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session table: Tracks app sessions for sync
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,                    -- UUID
    started_at INTEGER NOT NULL,            -- Unix timestamp (ms)
    ended_at INTEGER,                       -- Unix timestamp (ms)
    last_email_check_at INTEGER,            -- Unix timestamp (ms)
    last_history_id TEXT,
    device_info TEXT
);

-- Label cache: Gmail labels for reference
CREATE TABLE labels (
    id TEXT PRIMARY KEY,                    -- Gmail label ID
    name TEXT NOT NULL,
    type TEXT NOT NULL,                     -- 'system' | 'user'
    color_bg TEXT,
    color_text TEXT,
    updated_at INTEGER NOT NULL             -- Unix timestamp (ms)
);

-- Application metadata (single row)
CREATE TABLE app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert schema version
INSERT INTO app_metadata (key, value) VALUES ('schema_version', '1');
```

---

## Indexes

```sql
-- Email query optimization
CREATE INDEX idx_emails_date ON emails(date_received DESC);
CREATE INDEX idx_emails_sender ON emails(sender_email);
CREATE INDEX idx_emails_category ON emails(category);
CREATE INDEX idx_emails_is_read ON emails(is_read);
CREATE INDEX idx_emails_history ON emails(history_id);

-- Full-text search for email content
CREATE VIRTUAL TABLE emails_fts USING fts5(
    subject,
    body_text,
    snippet,
    content='emails',
    content_rowid='rowid'
);

-- Trigger to keep FTS index in sync
CREATE TRIGGER emails_fts_insert AFTER INSERT ON emails BEGIN
    INSERT INTO emails_fts(rowid, subject, body_text, snippet)
    VALUES (new.rowid, new.subject, new.body_text, new.snippet);
END;

CREATE TRIGGER emails_fts_delete AFTER DELETE ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, body_text, snippet)
    VALUES ('delete', old.rowid, old.subject, old.body_text, old.snippet);
END;

CREATE TRIGGER emails_fts_update AFTER UPDATE ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, body_text, snippet)
    VALUES ('delete', old.rowid, old.subject, old.body_text, old.snippet);
    INSERT INTO emails_fts(rowid, subject, body_text, snippet)
    VALUES (new.rowid, new.subject, new.body_text, new.snippet);
END;

-- Workflow execution queries
CREATE INDEX idx_workflow_exec_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_exec_session ON workflow_executions(session_id);
CREATE INDEX idx_workflow_exec_status ON workflow_executions(status);

-- Recipient lookups
CREATE INDEX idx_recipients_email ON email_recipients(email);
CREATE INDEX idx_recipients_email_id ON email_recipients(email_id);
```

---

## Runtime Validation (Zod)

```typescript
import { z } from 'zod';

export const EmailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email()
});

export const EmailBodySchema = z.object({
  text: z.string(),
  html: z.string().optional()
});

export const EmailSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  subject: z.string(),
  sender: EmailAddressSchema,
  recipients: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema).default([]),
  bcc: z.array(EmailAddressSchema).default([]),
  dateReceived: z.date(),
  body: EmailBodySchema,
  labels: z.array(z.string()),
  isRead: z.boolean(),
  category: z.enum(['primary', 'social', 'promotions', 'updates', 'forums']).optional(),
  snippet: z.string(),
  historyId: z.string(),
  syncedAt: z.date()
});

export const QuerySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  naturalLanguageText: z.string().min(1).max(1000),
  description: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastRunAt: z.date().optional(),
  runCount: z.number().int().min(0).default(0)
});

export const WorkflowActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('LABEL'),
    params: z.object({
      labelId: z.string(),
      labelName: z.string()
    })
  }),
  z.object({
    type: z.literal('ARCHIVE'),
    params: z.object({})
  }),
  z.object({
    type: z.literal('DELETE'),
    params: z.object({})
  })
]);

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  queryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  action: WorkflowActionSchema,
  executionOrder: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  lastEmailCheckAt: z.date().optional(),
  lastHistoryId: z.string().optional(),
  deviceInfo: z.string().optional()
});

export const LabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['system', 'user']),
  color: z.object({
    backgroundColor: z.string(),
    textColor: z.string()
  }).optional(),
  updatedAt: z.date()
});

// Type exports
type Email = z.infer<typeof EmailSchema>;
type Query = z.infer<typeof QuerySchema>;
type Workflow = z.infer<typeof WorkflowSchema>;
type Session = z.infer<typeof SessionSchema>;
type Label = z.infer<typeof LabelSchema>;
```

---

## State Transitions

### Workflow Execution State Machine

```
┌─────────┐    start     ┌──────────┐
│  idle   │ ───────────> │ running  │
└─────────┘              └────┬─────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         ┌────────┐     ┌──────────┐    ┌──────────┐
         │cancelled│     │ completed │    │  failed  │
         └────────┘     └──────────┘    └──────────┘
```

### Session State

```
┌─────────┐   start    ┌─────────┐   end    ┌─────────┐
│  none   │ ─────────> │ active  │ ───────> │ ended   │
└─────────┘            └─────────┘          └─────────┘
                            │
                            │ sync
                            ▼
                       ┌─────────┐
                       │ syncing │
                       └─────────┘
```
