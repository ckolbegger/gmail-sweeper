# Quickstart: AI Email Summary (006-claude-ai-summary)

**Branch**: `006-claude-ai-summary`

## Prerequisites

- Existing Gmail Sweep TUI working (`npm run build && npm start`)
- AI provider configured via environment variables:
  ```bash
  export AI_PROVIDER=anthropic
  export AI_API_KEY=sk-ant-...
  export AI_MODEL=claude-haiku-4-5-20251001
  ```

## New Files to Create

```
src/core/summary/index.ts
src/core/summary/service.ts
src/core/summary/prompt.ts
src/tui/hooks/useEmailSummary.ts
tests/unit/summary/service.test.ts
tests/unit/summary/prompt.test.ts
tests/unit/cache/summary-cache.test.ts
tests/unit/tui/useEmailSummary.test.ts
tests/unit/tui/EmailPreview.summary.test.tsx
tests/integration/summary-persistence.test.ts
```

## Files to Modify

```
src/core/models/index.ts       — add EmailSummary interface
src/core/cache/db.ts           — add email_summaries table + getSummary/setSummary
src/tui/hooks/useKeyboard.ts   — add onToggleSummary option + 's' binding
src/tui/components/EmailPreview.tsx  — add viewMode/summaryState props + summary rendering
src/tui/app.tsx                — wire useEmailSummary hook + detailViewMode state
```

## Running Tests

```bash
npm test                    # all tests
npm test -- --testPathPattern=summary  # only summary tests
```

## Manual Verification

1. Start the TUI: `npm start`
2. Navigate to any email (j/k)
3. Press 's' — should see `⏳ Generating summary...`
4. Summary appears: one sentence + bullets
5. Press 's' again — full email view restored
6. Navigate away and back, press 's' — summary appears instantly (cached)
7. Restart the app, select same email, press 's' — still instant (SQLite persisted)

## Key Bindings (updated)

| Key | Action |
|-----|--------|
| s | Toggle between full email and AI summary |
| (all existing) | unchanged |
