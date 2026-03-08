# Research: AI Email Summary (006-claude-ai-summary)

**Date**: 2026-03-07
**Branch**: `006-claude-ai-summary`

## Findings

### 1. Summary Storage Strategy

**Decision**: New `email_summaries` table in the existing sql.js SQLite database managed by `EmailCache`.

**Rationale**: The project already has a working SQLite layer (`src/core/cache/db.ts`). Adding a table requires only two new methods (`getSummary`, `setSummary`) and a schema migration guard (`CREATE TABLE IF NOT EXISTS`). No new package dependency. Survives app restarts. Consistent with how emails are cached.

**Alternatives considered**:
- In-memory only: Summaries lost on restart; violates FR-008 (persist across sessions).
- Separate JSON file: Concurrency-unsafe; harder to query; adds custom serialization code.
- Separate SQLite file: Unnecessary complexity; two files to manage; no benefit over one table.

---

### 2. AI Summarization Interface

**Decision**: New `SummaryService` class at `src/core/summary/service.ts`, separate from the existing `AiProvider` interface.

**Rationale**: The `AiProvider` interface (`classifyEmails`) is designed for batch classification with structured JSON output. Summarization is a different operation: single-email input, plain-text prose output (one sentence + list), no `matches`/`confidence` fields. Extending `AiProvider` would bloat the interface and require all existing provider implementations to implement a method they may not support. A dedicated service class keeps concerns clean and is independently testable.

**Alternatives considered**:
- Extend `AiProvider` with `summarizeEmail`: Violates Interface Segregation; forces `OpenAiProvider` to implement it even if unused.
- Standalone function: Less testable; no clear place to manage configuration or error handling.

---

### 3. View Toggle State Location

**Decision**: `detailViewMode: 'full' | 'summary'` state lives in `app.tsx`, resets to `'full'` when `selectedEmail.id` changes.

**Rationale**: `app.tsx` already owns `previewScrollOffset` (via `useKeyboard`), which also resets on navigation. The pattern is consistent. The toggle callback flows: `useKeyboard onToggleSummary` → `app.tsx` setState → `EmailPreview viewMode` prop. `EmailPreview` remains a pure display component.

**Alternatives considered**:
- State inside `EmailPreview`: Couples display to business logic; harder to test toggle in isolation.
- State inside `useEmailSummary`: The hook is for async AI state, not UI toggle mode; mixing concerns.

---

### 4. Existing Key Binding Audit

**Decision**: 's' is unbound. Safe to add.

**Evidence**: Full audit of `src/tui/hooks/useKeyboard.ts` useInput handler:
- `q`: quit
- `f`: activate filter
- `e`: archive
- `#`: delete
- `r` (ctrl): refresh
- `n` (ctrl): load more
- `]` / `[`: preview scroll
- `j` / `k`, arrows, Enter, PageUp/Down: navigation
- Escape: clear filter
- Tab / Shift+Tab (in `EmailPreview`): link focus
- `c`, `o` (in `EmailPreview`): copy/open link

'`s`' is not used anywhere. No conflict.

---

### 5. Loading State UX Pattern

**Decision**: Inline loading text inside `EmailPreview` when `summaryState.status === 'loading'`. Inline error text when `status === 'error'`.

**Rationale**: `EmailPreview` already renders inline states: `"No email selected."`, `"(No body)"`. The pattern is established. No new component needed. Keeps the right pane always occupied with contextually relevant content.

**Pattern**:
```
[Subject line]
From: ...
To: ...
────────────────────────────
⏳ Generating summary...
```

```
[Subject line]
From: ...
To: ...
────────────────────────────
⚠ Could not generate summary. Press 's' to try again.
```

---

### 6. Summary Prompt Strategy

**Decision**: System prompt sets assistant role as "email summarizer"; user prompt provides the email body and requests exactly one summary sentence followed by a Markdown bullet list of action items (or "None" if none exist).

**Rationale**: Structured output request reduces hallucination and makes parsing deterministic. The response is plain text (not JSON), so no parse-error handling complexity.

**Response format expected**:
```
One-sentence summary here.

- Action item 1
- Action item 2
```

Or if no action items:
```
One-sentence summary here.

- None
```

**Parsing strategy**: Split on first blank line. First part = `oneSentence`. Remaining lines starting with `- ` (after stripping `- None`) = `actionItems`.
