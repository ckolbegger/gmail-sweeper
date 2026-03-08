# Implementation Plan: AI Email Summary

**Branch**: `006-claude-ai-summary` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-claude-ai-summary/spec.md`

## Summary

When the user presses 's' in the TUI, the detail panel toggles between full email view and an AI-generated summary (one sentence + action-item bullets). Summaries are persisted to the existing SQLite cache so the AI is called at most once per email. The feature extends four existing layers: the SQLite cache (new table + methods), a new core `SummaryService` (AI prompt + response parsing), a new `useEmailSummary` hook (async state + cache coordination), and the existing `EmailPreview` component + `useKeyboard` hook (view-mode toggle).

## Technical Context

**Language/Version**: TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`)
**Primary Dependencies**: Ink 4.0, React 18, ink-testing-library 3.0, @anthropic-ai/sdk (existing), openai (existing)
**Storage**: sql.js SQLite via existing `EmailCache` (`src/core/cache/db.ts`) — new `email_summaries` table added
**Testing**: Jest + ink-testing-library 3.0; TDD strict (failing test before any production code)
**Target Platform**: Linux/macOS terminal (TUI application)
**Project Type**: Single project
**Performance Goals**: Cached summary display < 100ms; AI generation completes within 30s timeout
**Constraints**: AI called at most once per email lifetime; 's' key no-op when no email selected
**Scale/Scope**: Per-session in-memory + SQLite persistence for summary cache

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | ✅ PASS | Summary generation is read-only. No credentials logged. Email body passed to AI only on explicit user request ('s' key). |
| II. Strict TDD | ✅ PASS | All tasks will follow Write Test → Fail → Write Code → Pass → Refactor. Unit tests mock AI provider. Integration tests verify cache persistence. |
| III. Modular Architecture | ✅ PASS | `SummaryService` in `src/core/summary/` is isolated from TUI. Hook in `src/tui/hooks/` only coordinates state. `EmailCache` extended with narrow methods. |
| IV. CLI Excellence | ✅ PASS | N/A — feature is TUI-only; no CLI surface changed. |
| V. Simplicity & YAGNI | ✅ PASS | No bulk summarization, no settings/configuration, no export. Minimum viable toggle. |

**Post-design re-check**: Gates unchanged. New `email_summaries` table reuses existing SQLite infrastructure without adding a new dependency.

## Project Structure

### Documentation (this feature)

```text
specs/006-claude-ai-summary/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
  core/
    summary/
      index.ts            # barrel export
      service.ts          # SummaryService — AI call + response parsing
      prompt.ts           # prompt builder for summary generation
    cache/
      db.ts               # extended: getSummary(), setSummary(), email_summaries table
    models/
      index.ts            # extended: EmailSummary interface
  tui/
    hooks/
      useEmailSummary.ts  # async state machine + cache coordination
    components/
      EmailPreview.tsx    # extended: viewMode + summaryState props

tests/
  unit/
    summary/
      service.test.ts           # SummaryService unit tests (mocked AI)
      prompt.test.ts            # prompt builder unit tests
    cache/
      summary-cache.test.ts     # EmailCache getSummary/setSummary unit tests
    tui/
      useEmailSummary.test.ts   # hook state machine tests
      EmailPreview.summary.test.tsx  # component view-mode rendering tests
  integration/
    summary-persistence.test.ts # end-to-end: generate → persist → reload from cache
```

**Structure Decision**: Single project (Option 1). New `src/core/summary/` module added alongside existing `src/core/ai/`, `src/core/cache/`, etc. No new top-level directories.

## Complexity Tracking

No Constitution violations. No justification table required.

---

## Phase 0: Research

*See [research.md](./research.md) for full findings.*

### Unknowns Resolved

| Unknown | Decision | Rationale |
|---------|----------|-----------|
| Where to store summaries | New `email_summaries` table in existing SQLite DB | Reuses `EmailCache` infrastructure; no new dependency; survives app restarts; purged when user clears cache |
| How to expose AI summarization | New `SummaryService` class in `src/core/summary/service.ts` | Keeps `AiProvider` interface focused on classification; summary has different prompt/response shape |
| View toggle state location | `app.tsx` owns `detailViewMode` state; passed down to `EmailPreview` | State resets naturally when email changes; consistent with how `previewScrollOffset` is managed |
| 's' key conflicts | No existing binding uses 's' | Confirmed by reading `useKeyboard.ts` — safe to add |
| Loading state display | Inline in `EmailPreview` when `summaryState.status === 'loading'` | Avoids new component; consistent with existing inline error/empty states in that component |

---

## Phase 1: Design & Contracts

*See [data-model.md](./data-model.md) and [contracts/](./contracts/) for full artifacts.*

### Key Design Decisions

1. **`AiProvider` is not extended.** Summary generation is structurally different from classification (different prompt, different response shape, single-email input). A new `SummaryService` is the right abstraction.

2. **`SummaryService` takes `AiProviderConfig` directly** and creates its own provider instance. This mirrors how classification works in the filter pipeline and keeps the constructor simple.

3. **`useEmailSummary` hook** manages four states per email: `idle`, `loading`, `ready`, `error`. State resets to `idle` when `emailId` changes. It reads from `EmailCache` on first request before calling the AI.

4. **`EmailPreview` receives `viewMode` and `summaryState` as props.** The parent (`app.tsx`) owns the toggle. `EmailPreview` renders accordingly. This keeps the component testable without simulating AI calls.

5. **`useKeyboard` gets `onToggleSummary` option.** The 's' key calls it only when `itemCount > 0`. The callback lives in `app.tsx` and delegates to `useEmailSummary`.
