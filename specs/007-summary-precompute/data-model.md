# Data Model: Background Summary Precomputation

**Feature**: 007-summary-precompute
**Date**: 2026-03-08

---

## Existing Entities (Unchanged)

### EmailSummary *(no changes)*
Defined in `src/core/models/index.ts`. Used as-is.

```
EmailSummary {
  emailId: string          // FK → emails.id
  oneSentence: string      // AI-generated one-sentence description
  actionItems: string[]    // AI-extracted action items (may be empty)
  generatedAt: Date        // Timestamp of generation
}
```

Persisted in `email_summaries` table (SQLite, `src/core/cache/db.ts`). No schema changes required.

---

## New Entities

### PrecomputeConfig
Runtime-only (not persisted). Holds the two configurable limits read from environment variables.

```
PrecomputeConfig {
  coverageLimit: number    // Max emails to cover per pass. Default: 500. Source: SUMMARY_PRECOMPUTE_LIMIT
  maxDepth: number         // Absolute position ceiling. Default: 500. Source: SUMMARY_PRECOMPUTE_MAX_DEPTH
}
```

**Derived value**: `effectiveDepth = Math.min(coverageLimit, maxDepth)`
This is the number of emails fetched from cache on each pass.

---

### WorkerState (internal to PrecomputeWorker)
Not exposed outside the worker module.

```
WorkerState: 'idle' | 'running' | 'cancelled'
```

State transitions:
```
idle ──start()──► running ──pass completes──► idle
                      │
                      └──restart()/stop()──► cancelled ──► idle (on next pass start)
```

---

## No New Storage

This feature adds no new database tables or columns. All summary storage continues through the existing `email_summaries` table via `cache.getSummary()` / `cache.setSummary()`.

---

## Query Patterns

### Fetch emails for a worker pass
Uses existing `EmailCache.getEmails()`:
```
cache.getEmails({
  sortBy: 'date',
  sortDesc: true,
  limit: effectiveDepth     // Math.min(coverageLimit, maxDepth)
})
→ Email[]   // ordered newest → oldest, up to effectiveDepth items
```

### Check for existing summary
Uses existing `EmailCache.getSummary()`:
```
cache.getSummary(email.id)
→ EmailSummary | null
```
`null` → email needs precomputation.

### Persist generated summary
Uses existing `EmailCache.setSummary()`:
```
cache.setSummary({
  emailId: email.id,
  oneSentence: ...,
  actionItems: [...],
  generatedAt: new Date()
})
```
