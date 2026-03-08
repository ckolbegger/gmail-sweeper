# Data Model: AI Email Summary

**Date**: 2026-03-07
**Feature**: 006-glm-ai-summary

## Overview

This feature extends the existing Email entity with a summary field. No new database tables are required. The data model consists of:

1. **Email Summary** (persisted data - stored as JSON in emails table)
2. **Summary Generation State** (transient UI state)
3. **AI Provider Configuration** (existing, reused from smart filter)

---

## Entities

### 1. Email Summary

**Purpose**: AI-generated summary of an email, persisted in the database

**Storage**: JSON string in `emails.summary` column

**Schema**:

```typescript
interface EmailSummary {
  summary: string; // One-sentence description of email content
  actionItems: string[]; // Array of action items extracted from email
}
```

**Example**:

```json
{
  "summary": "Meeting request from John about Q4 budget review next Tuesday at 2pm.",
  "actionItems": [
    "Confirm attendance for Tuesday 2pm meeting",
    "Review Q4 budget proposal before meeting",
    "Send calendar invite to stakeholders"
  ]
}
```

**Validation Rules**:

- `summary`: Required string, 1-500 characters
- `actionItems`: Required array, 0-20 items
- Each action item: Required string, 1-200 characters

**Relationships**:

- Belongs to one Email (1:1, stored on email record)
- Created by AI Provider (generated, not user-created)
- Immutable once generated (no updates, only generation or regeneration)

**State Transitions**:

```
null → [User presses 's'] → [LLM generates] → EmailSummary
                                                    ↓
                                    [User presses 's' again] → Display summary
```

---

### 2. Summary Generation State

**Purpose**: Track the state of summary generation for the currently selected email

**Storage**: React component state (in-memory, not persisted)

**Schema**:

```typescript
interface SummaryGenerationState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  isShowingSummary: boolean;
}
```

**State Values**:

- `idle`: No summary generation in progress, summary view not shown
- `loading`: LLM call in progress, loading indicator shown
- `success`: Summary generated successfully, ready to display
- `error`: LLM call failed, error message shown
- `isShowingSummary`: true if summary view is displayed, false if full email is displayed

**Example States**:

```typescript
// Initial state (no email selected)
{ status: 'idle', isShowingSummary: false }

// Generating summary
{ status: 'loading', isShowingSummary: false }

// Summary generated and displayed
{ status: 'success', isShowingSummary: true }

// Generation failed
{ status: 'error', error: 'API timeout', isShowingSummary: false }
```

**Validation Rules**:

- `status`: Required enum value
- `error`: Optional string, only present when status is 'error'
- `isShowingSummary`: Required boolean

**Relationships**:

- Associated with currently selected Email (transient, not stored)
- Controlled by EmailDetail component

**State Transitions**:

```
idle → [press 's', no summary exists] → loading
loading → [LLM success] → success + isShowingSummary=true
loading → [LLM failure] → error
success → [press 's'] → isShowingSummary toggles
error → [press 's'] → loading (retry)
```

---

### 3. AI Provider Configuration

**Purpose**: Configuration for LLM service (Anthropic or OpenAI)

**Storage**: Environment variables (existing)

**Schema**: (Existing, reused)

```typescript
interface AiProviderConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxContextTokens: number;
}
```

**Usage in This Feature**:

- Read from environment via `resolveAiConfig()`
- Passed to `SummaryService` constructor
- Used to initialize AI provider for summary generation

**No Changes Required**: Existing configuration infrastructure is sufficient.

---

## Database Schema Changes

### Migration: `003_add_summary_column.sql`

```sql
-- Add summary column to emails table
ALTER TABLE emails ADD COLUMN summary TEXT;

-- Note: Summary stores JSON string of EmailSummary interface
-- Example value: '{"summary":"...","actionItems":["...","..."]}'
```

**Impact**:

- Existing emails will have `summary = NULL` (no summary generated)
- New column is nullable (summaries generated on-demand)
- No data migration required (lazy generation)

---

## Email Model Updates

### Validation Schema: `src/core/models/validation.ts`

```typescript
export const EmailSchema = z.object({
  // ... existing fields
  id: z.string(),
  threadId: z.string(),
  subject: z.string(),
  sender: EmailAddressSchema,
  recipients: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema),
  bcc: z.array(EmailAddressSchema),
  dateReceived: z.date(),
  body: EmailBodySchema,
  labels: z.array(z.string()),
  isRead: z.boolean(),
  category: z.enum(['social', 'promotions', 'updates', 'forums']).optional(),
  snippet: z.string(),
  historyId: z.string(),
  syncedAt: z.date(),

  // NEW FIELD
  summary: z.string().optional(), // JSON string of EmailSummary
});
```

**Type Inference**:

```typescript
export type Email = z.infer<typeof EmailSchema>;
// Email.summary will be: string | undefined
```

---

## Repository Changes

### EmailRepository: `src/core/services/email-repository.ts`

#### Update `save()` method:

```typescript
async save(email: Email): Promise<void> {
  const stmt = this.db.prepare(`
    INSERT OR REPLACE INTO emails (
      id, thread_id, subject, sender_name, sender_email,
      recipients, cc, bcc, date_received, body_text, body_html,
      labels, is_read, category, snippet, history_id, synced_at,
      summary  -- NEW COLUMN
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // ... existing parameter binding

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
    syncedAt,
    email.summary || null  // NEW PARAMETER
  );
}
```

#### Update `mapRowToEmail()` method:

```typescript
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
    summary: row.summary,  // NEW FIELD (already a string, no parsing needed)
  };
}
```

---

## Data Flow

### Summary Generation Flow

```
User presses 's'
    ↓
EmailDetail component checks email.summary
    ↓
    ├─ [summary exists] → Toggle isShowingSummary state
    │
    └─ [no summary] → Set status='loading'
        ↓
        SummaryService.generateSummary(email)
            ↓
            buildSummaryPrompt(email)
            ↓
            AiProvider.callLLM(prompt)
            ↓
            Parse JSON response → EmailSummary
            ↓
            EmailRepository.save(email with summary)
            ↓
            Set status='success', isShowingSummary=true
```

### Summary Retrieval Flow

```
User selects email
    ↓
EmailRepository.getById(id)
    ↓
Returns Email with summary field (string | undefined)
    ↓
EmailDetail component receives email prop
    ↓
    ├─ [summary exists] → 's' key shows summary immediately
    │
    └─ [no summary] → 's' key triggers generation
```

---

## Index & Performance

### No Index Changes Required

- Summary field is not searchable (not in FTS)
- Summary field is not used for filtering/sorting
- Retrieval is by email ID (existing primary key index)
- Summary is small (<500 chars typically), minimal storage impact

### Future Considerations

If summary search is needed in the future:

1. Add summary to `emails_fts` virtual table
2. Update FTS triggers to include summary
3. Add migration to rebuild FTS index

---

## Migration Strategy

### Zero-Downtime Migration

1. **Deploy migration** (`003_add_summary_column.sql`):
   - Adds nullable column
   - No data transformation
   - Existing queries unaffected

2. **Deploy code**:
   - Repository handles NULL values gracefully
   - UI checks for summary existence before display
   - Backward compatible (works with NULL)

3. **Lazy generation**:
   - Summaries generated on-demand
   - No batch generation required
   - Database load spread over time

### Rollback Strategy

If issues arise:

1. Code rollback: Remove summary-related code
2. Migration rollback: `ALTER TABLE emails DROP COLUMN summary;`
3. No data loss (summaries are regeneratable)

---

## Constraints & Assumptions

### Constraints

- Summary size: <1KB per email (practical limit for TEXT column)
- Generation time: <5 seconds (perceived instant)
- API rate limits: Respect Anthropic/OpenAI rate limits
- Concurrent requests: Handle user switching emails mid-generation

### Assumptions

- Summaries are immutable (no updates after generation)
- Summary format is fixed (no user customization)
- One summary per email (no versioning)
- Summary generation is idempotent (same email → same summary)

---

## Summary

This feature extends the existing Email entity with minimal database changes:

- **1 new column**: `emails.summary` (TEXT, nullable)
- **0 new tables**: Leverages existing emails table
- **0 new indexes**: Summary not used for search/filter
- **Type-safe**: Zod schema ensures validation
- **Lazy generation**: Summaries created on-demand
- **Backward compatible**: Works with NULL values

The data model is simple, follows existing patterns, and requires minimal infrastructure changes.
