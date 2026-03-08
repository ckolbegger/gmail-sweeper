# Data Model: AI Email Summary (006-claude-ai-summary)

**Date**: 2026-03-07
**Branch**: `006-claude-ai-summary`

## New Types

### `EmailSummary` (core domain model)

Added to `src/core/models/index.ts`.

```typescript
export interface EmailSummary {
  /** Gmail message ID this summary belongs to */
  emailId: string;
  /** One-sentence description of the email content */
  oneSentence: string;
  /** Action items extracted from the email (empty array if none) */
  actionItems: string[];
  /** When the summary was generated */
  generatedAt: Date;
}
```

### `SummaryState` (TUI view state — local to hook)

Used by `useEmailSummary` hook. Not persisted.

```typescript
export type SummaryStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SummaryState {
  status: SummaryStatus;
  summary: EmailSummary | null;   // set when status === 'ready'
  error: string | null;            // set when status === 'error'
}
```

### `DetailViewMode` (TUI toggle state — local to app)

```typescript
export type DetailViewMode = 'full' | 'summary';
```

---

## Database Changes

### New table: `email_summaries`

Added in `EmailCache.initialize()` via `CREATE TABLE IF NOT EXISTS`.

```sql
CREATE TABLE IF NOT EXISTS email_summaries (
  email_id      TEXT PRIMARY KEY,
  one_sentence  TEXT NOT NULL,
  action_items_json TEXT NOT NULL,  -- JSON array of strings
  generated_at  TEXT NOT NULL       -- ISO 8601 timestamp
);
```

### New `EmailCache` methods

```typescript
// Returns null if no summary cached for this email
getSummary(emailId: string): EmailSummary | null

// Upserts a summary (INSERT OR REPLACE)
setSummary(emailId: string, summary: EmailSummary): void
```

---

## State Transitions

### `SummaryState` machine (per selected email)

```
         email changes
         ┌──────────────────────────────────────┐
         ▼                                      │
       [idle] ──press 's'──► [loading] ──success──► [ready]
                                  │                    │
                               failure               press 's'
                                  │                    │
                               [error]              [idle/full]
                                  │
                              press 's'
                                  │
                             [loading] (retry)
```

### `DetailViewMode` transitions in `app.tsx`

```
[full] ──press 's' (email selected)──► [summary]
[summary] ──press 's'──► [full]
[any] ──navigate to different email──► [full]
```
