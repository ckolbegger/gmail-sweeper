# Data Model: Smart Inbox Organizer

**Date**: 2026-02-01 | **Branch**: `claude`

## Overview

This document defines the domain entities for the Smart Inbox Organizer. The data model is designed to be frontend-agnostic (per FR-001) and supports both TUI and future web interfaces.

---

## Core Entities (TypeScript)

### Email

Represents a Gmail message with metadata for display and actions.

```typescript
interface Email {
  id: string;                    // Gmail message ID
  threadId: string;              // Gmail thread ID
  subject: string;               // Email subject line
  sender: EmailAddress;          // From address
  recipients: EmailAddress[];    // To/CC addresses
  date: Date;                    // Send/receive timestamp
  snippet: string;               // Preview text (first ~100 chars)
  bodyText?: string;             // Plain text body (lazy loaded)
  bodyHtml?: string;             // HTML body (lazy loaded)
  labels: Label[];               // Applied Gmail labels
  category?: Category;           // Gmail category
  isRead: boolean;               // Read/unread status
  isStarred: boolean;            // Starred status
  hasAttachments: boolean;       // Has attachments
}
```

**Validation Rules**:
- `id` is unique and immutable
- `date` must be valid Date
- `sender.email` must have valid email format

**State Transitions**:
- `isRead`: false → true (on view), true → false (mark unread)
- `labels`: can be added/removed
- Archived: removes from inbox (no INBOX label)
- Deleted: moves to trash

---

### EmailAddress

Represents an email address with optional display name.

```typescript
interface EmailAddress {
  email: string;                 // Email address (e.g., user@example.com)
  name?: string;                 // Display name (e.g., "John Doe")
}
```

**Validation Rules**:
- `email` must match RFC 5322 format

---

### Label

Represents a Gmail label for categorization.

```typescript
interface Label {
  id: string;                    // Gmail label ID
  name: string;                  // Label name (e.g., "Work", "Personal")
  type: LabelType;               // SYSTEM or USER
  color?: string;                // Hex color code (user labels only)
}

type LabelType = 'system' | 'user';
```

**System Labels**:
- `INBOX`, `SENT`, `TRASH`, `SPAM`, `DRAFT`, `STARRED`, `IMPORTANT`, `UNREAD`

---

### Category

Gmail's automatic categorization.

```typescript
type Category =
  | 'primary'      // Main inbox
  | 'social'       // Social network notifications
  | 'promotions'   // Marketing and promotional emails
  | 'updates'      // Bills, receipts, statements
  | 'forums';      // Mailing lists and forums
```

---

### NaturalLanguageQuery

User-entered search query for semantic email matching.

```typescript
interface NaturalLanguageQuery {
  text: string;                  // Raw query text
  timestamp: Date;               // When query was executed
  resultsCount: number;          // Number of matching emails
}
```

**Validation Rules**:
- `text` must be non-empty
- `text` max length: 500 characters

---

### SavedQuery (TUI Fast Follow)

A persisted query with optional associated action.

```typescript
interface SavedQuery {
  id: string;                    // Unique identifier (UUID)
  name: string;                  // User-defined name
  queryText: string;             // Natural language query
  action?: Action;               // Optional action to apply
  order: number;                 // Execution order (for session start)
  createdAt: Date;               // Creation timestamp
  lastRun?: Date;                // Last execution timestamp
  lastRunCount: number;          // Emails matched on last run
}
```

**Validation Rules**:
- `name` must be unique per user
- `name` max length: 100 characters
- `order` must be >= 0

---

### Action

An operation to perform on emails.

```typescript
type Action =
  | { type: 'applyLabel'; labelId: string }
  | { type: 'archive' }
  | { type: 'delete' };
```

---

### ClassificationResult

Result of NL classification for an email.

```typescript
interface ClassificationResult {
  emailId: string;               // Email ID
  matches: boolean;              // Whether email matches query
  confidence: number;            // Confidence score (0.0-1.0)
  reasoning?: string;            // Optional explanation
}
```

---

### UserSession

Tracks session state for saved query prompts.

```typescript
interface UserSession {
  userEmail: string;             // Gmail account email
  lastSession: Date;             // Last session end time
  lastEmailSync: Date;           // Last email sync timestamp
}
```

---

### Config

User configuration.

```typescript
interface Config {
  gmailAccount: string;          // Gmail account email
  initialLoadSize: number;       // Emails to load on start (default: 50)
  llmProvider: 'claude' | 'gemini';
  llmApiKeyEnv: string;          // Env var name for API key
  theme: string;                 // TUI/web theme
  confirmDestructive: boolean;   // Require confirmation for archive/delete
}
```

---

## Entity Relationships

```
Email
├── sender: EmailAddress (1:1)
├── recipients: EmailAddress[] (1:many)
├── labels: Label[] (many:many)
└── category?: Category (1:0..1)

SavedQuery
├── action?: Action (1:0..1)
└── executes against: Email[] (query:many)

ClassificationResult
└── emailId -> Email.id (many:1)

UserSession
└── userEmail -> Gmail account (1:1)
```

---

## Storage Schema (SQLite)

### emails (cache)

```sql
CREATE TABLE emails (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    subject TEXT,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    date TEXT NOT NULL,  -- ISO 8601
    snippet TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    has_attachments INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    labels_json TEXT,  -- JSON array of label IDs
    cached_at TEXT NOT NULL  -- ISO 8601
);

CREATE INDEX idx_emails_date ON emails(date DESC);
CREATE INDEX idx_emails_sender ON emails(sender_email);
```

### saved_queries (TUI Fast Follow)

```sql
CREATE TABLE saved_queries (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    action_type TEXT,  -- applyLabel, archive, delete, NULL
    action_payload TEXT,  -- labelId for applyLabel
    execution_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    last_run TEXT,
    last_run_count INTEGER DEFAULT 0
);

CREATE INDEX idx_saved_queries_order ON saved_queries(execution_order);
```

### user_session

```sql
CREATE TABLE user_session (
    user_email TEXT PRIMARY KEY,
    last_session TEXT NOT NULL,
    last_email_sync TEXT NOT NULL
);
```

---

## Configuration Schema (JSON)

### ~/.config/gmail-sweep/config.json

```json
{
  "gmailAccount": "user@gmail.com",
  "initialLoadSize": 50,
  "llmProvider": "claude",
  "llmApiKeyEnv": "ANTHROPIC_API_KEY",
  "theme": "default",
  "confirmDestructive": true
}
```

---

## Notes

- Email body (`bodyText`/`bodyHtml`) is lazy-loaded on demand to reduce initial sync time
- Labels are stored as JSON array in SQLite for simplicity (denormalized)
- All timestamps stored as ISO 8601 strings in SQLite for portability
- SavedQuery entity deferred to TUI Fast Follow phase
- TypeScript types are the source of truth; SQLite schema mirrors them for persistence
