# Implementation Plan: Background Summary Precomputation

**Branch**: `007-summary-precompute` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-summary-precompute/spec.md`

## Summary

Add a background worker that automatically precomputes AI email summaries for the newest-first N emails in the local cache, restarting on each new email fetch. Reuses `SummaryService` and `EmailCache` from feature 006 with no modifications; adds a single new module `src/core/summary/precompute-worker.ts`.

## Technical Context

**Language/Version**: TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`)
**Primary Dependencies**: `@anthropic-ai/sdk` / `openai` (existing), `sql.js` (existing), Ink 4.0 + React 18 (TUI, existing)
**Storage**: sql.js SQLite — existing `email_summaries` table; no schema changes
**Testing**: Vitest 1.0, ink-testing-library 3.0, `vi.fn()` mocking
**Target Platform**: Node.js (Linux/macOS desktop)
**Project Type**: Single project
**Performance Goals**: UI keystrokes unaffected; worker begins within 5s of startup; restarts within 2s of fetch
**Constraints**: Silent background operation — no UI coupling in worker module; no inter-call delay; exponential back-off on rate-limit (max 3 attempts)
**Scale/Scope**: Default coverage of 500 emails; configurable via env vars

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Safety & Security | ✅ Pass | Worker reads from Gmail cache only; writes only to local summary cache. No new network surface beyond existing AI calls. No secrets logged. |
| II. Strict TDD | ✅ Pass | Unit + integration tests required per task. All production code follows test-first workflow. |
| III. Modular Architecture | ✅ Pass | `PrecomputeWorker` is a pure core module (`src/core/summary/`). Zero UI coupling. Injected into TUI layer at bootstrap. |
| IV. CLI Excellence | ✅ Pass | Configuration via env vars (`SUMMARY_PRECOMPUTE_LIMIT`, `SUMMARY_PRECOMPUTE_MAX_DEPTH`). No new CLI flags needed. |
| V. Simplicity & YAGNI | ✅ Pass | One new file. No new dependencies. No new DB tables. Reuses existing `SummaryService`, `EmailCache`, `AbortController` pattern. |

**No violations.** Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/007-summary-precompute/
├── plan.md              ✅ This file
├── research.md          ✅ Phase 0 output
├── data-model.md        ✅ Phase 1 output
├── quickstart.md        ✅ Phase 1 output
├── contracts/
│   └── precompute-worker.md  ✅ Phase 1 output
└── tasks.md             📋 Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code Changes

```text
src/
  core/
    summary/
      precompute-worker.ts   # NEW: PrecomputeWorker class + readPrecomputeConfig()
      index.ts               # UPDATED: export PrecomputeWorker, PrecomputeConfig, readPrecomputeConfig
  tui/
    index.tsx                # UPDATED: instantiate + start worker after cache.initialize()
    app.tsx                  # UPDATED: accept worker prop, pass worker.restart to useGmail
    hooks/
      useGmail.ts            # UPDATED: accept onEmailsFetched callback, call on loadMore success

tests/
  unit/
    summary/
      precompute-worker.test.ts   # NEW
  integration/
    precompute-worker.test.ts     # NEW
```

**Structure Decision**: Single project (existing layout). All new code lives in `src/core/summary/` (pure logic) and minimal wiring in `src/tui/` (bootstrap + callback).

## Phase 0: Research

**Status**: ✅ Complete — see [research.md](research.md)

Key decisions resolved:

| Decision | Choice |
|---|---|
| Worker async pattern | `AbortController` + async loop (mirrors smart-filter.ts) |
| Email ordering query | `cache.getEmails({ sortBy: 'date', sortDesc: true, limit: effectiveDepth })` |
| Cancellation ownership | Worker owns its `AbortController`; exposes `restart()` / `stop()` |
| `SummaryService` reuse | Injected via constructor — same instance as manual 's' flow |
| Persistence strategy | Write immediately after each successful AI response |
| Config source | `process.env.SUMMARY_PRECOMPUTE_LIMIT` / `SUMMARY_PRECOMPUTE_MAX_DEPTH` |
| Worker instantiation site | `src/tui/index.tsx` inside `launchTUI()`, after `cache.initialize()` |
| Error handling | Per-email try/catch; rate-limit back-off 1s/2s/4s max 3 attempts |

## Phase 1: Design & Contracts

**Status**: ✅ Complete

| Artifact | Path |
|---|---|
| Data model | [data-model.md](data-model.md) |
| Worker contract | [contracts/precompute-worker.md](contracts/precompute-worker.md) |
| Manual verification | [quickstart.md](quickstart.md) |

### Design Summary

**`PrecomputeConfig`** — runtime-only record, no persistence:
- `coverageLimit`: N (env `SUMMARY_PRECOMPUTE_LIMIT`, default 500)
- `maxDepth`: MAXIMUM_DEPTH (env `SUMMARY_PRECOMPUTE_MAX_DEPTH`, default 500)
- `effectiveDepth = Math.min(coverageLimit, maxDepth)` — the actual query limit each pass

**`PrecomputeWorker`** — class in `src/core/summary/precompute-worker.ts`:
- `start()` / `restart()` / `stop()` public API
- Each pass fetches `effectiveDepth` emails newest-first, skips summarised ones, calls `service.summarize()` for the rest
- Rate-limit back-off: 1s → 2s → 4s, max 3 attempts per email
- All errors caught internally — caller needs no `.catch()` handler

**Integration wiring**:
1. `launchTUI()` creates worker and calls `worker.start()`
2. `InboxApp` receives `worker` as a prop
3. `useGmail` gains `onEmailsFetched?: () => void` option; called after successful `loadMore()`
4. `app.tsx` passes `() => worker.restart()` as `onEmailsFetched`

### Constitution Re-check (post-design)

All 5 principles still pass. No new violations introduced by the design.

## Implementation Notes for `/speckit.tasks`

**Suggested task phases**:

1. **Phase 1 (Foundational)**: `readPrecomputeConfig()` + stub `PrecomputeWorker` + barrel update (unblocks all subsequent tasks)
2. **Phase 2 (Core worker)**: Full `PrecomputeWorker` implementation + unit tests (US1 + US4 logic)
3. **Phase 3 (Restart on fetch)**: `useGmail` `onEmailsFetched` callback + `app.tsx` wiring (US2)
4. **Phase 4 (Bootstrap)**: `launchTUI()` instantiation + `start()` call (US1 end-to-end)
5. **Phase 5 (Integration test)**: Real-cache integration test for persistence
6. **Phase 6 (Polish)**: `CLAUDE.md` update

**Parallel opportunities**: Config reading (Phase 1) and stub creation can be done in one task. Core worker logic and useGmail callback wiring are independent once the worker stub exists.
