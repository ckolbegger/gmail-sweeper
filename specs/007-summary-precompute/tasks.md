# Tasks: Background Summary Precomputation

**Input**: Design documents from `/specs/007-summary-precompute/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**TDD Approach**: Each task includes writing tests against a stub implementation first, then iterating until all tests pass. Tests and implementation are a single unit of work — not separated.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stub out the new `src/core/summary/precompute-worker.ts` module so it can be referenced by subsequent tasks.

- [x] T001 Create `src/core/summary/precompute-worker.ts` as an empty module stub (exports `PrecomputeConfig` interface, `readPrecomputeConfig`, and `PrecomputeWorker` class as unimplemented stubs); update `src/core/summary/index.ts` barrel to re-export all three

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `readPrecomputeConfig()` is the shared building block that all user stories depend on for their environment-variable-driven limits.

**⚠️ CRITICAL**: Phases 3–6 cannot begin until this phase is complete.

- [x] T002 Implement `readPrecomputeConfig(): PrecomputeConfig` in `src/core/summary/precompute-worker.ts` reading `SUMMARY_PRECOMPUTE_LIMIT` and `SUMMARY_PRECOMPUTE_MAX_DEPTH` from `process.env`, defaulting both to 500, treating invalid/missing values as 500; implement the derived `effectiveDepth = Math.min(coverageLimit, maxDepth)` helper; write and pass unit tests in `tests/unit/summary/precompute-worker.test.ts` covering: both defaults return 500, each env var overrides its respective field, invalid string falls back to 500, negative integer falls back to 500, effectiveDepth = min when maxDepth < coverageLimit, effectiveDepth = coverageLimit when maxDepth >= coverageLimit

**Checkpoint**: `PrecomputeConfig` type importable; `readPrecomputeConfig()` verified by tests.

---

## Phase 3: User Story 1 — Automatic Background Summarisation on Startup (Priority: P1) 🎯 MVP

**Goal**: Worker starts automatically when the app launches, processes emails newest→oldest, skips already-summarised ones, and stops once `effectiveDepth` emails have been examined. Silent — no UI feedback.

**Independent Test**: Start the app with a cache containing unsummarised emails. Wait 10–30 seconds. Press 's' on a previously-untouched email near the top of the inbox. Summary appears instantly (cache hit), confirming the worker ran without user interaction.

- [x] T003 [US1] Implement `PrecomputeWorker` class in `src/core/summary/precompute-worker.ts` with `start(): void` and `stop(): void` public methods and an async pass loop using `AbortController` for cancellation; the loop must: fetch `effectiveDepth` emails via `cache.getEmails({ sortBy: 'date', sortDesc: true, limit: effectiveDepth })`, iterate newest→oldest, skip emails where `cache.getSummary(email.id) !== null`, call `service.summarize(email)` and immediately call `cache.setSummary(result)` on success, skip individual email on non-retryable `SummaryGenerationError`, retry up to 3× with 1s/2s/4s back-off on rate-limit errors then skip, check `signal.aborted` at the top of each iteration; the worker MUST NOT throw unhandled exceptions; write and pass unit tests in `tests/unit/summary/precompute-worker.test.ts` covering: processes only unsummarised emails (skips those with existing summaries), processes in newest-first order, stops after examining exactly `effectiveDepth` emails, single AI failure skipped — remaining emails processed, `stop()` aborts an in-progress pass, rate-limit error retried up to 3× then skipped, `start()` when already running is a no-op (depends on T002)

- [x] T004 [US1] Wire worker bootstrap in `src/tui/index.tsx`: after `await cache.initialize()`, create a `SummaryService` instance (same `AiProviderConfig` as already used) and a `PrecomputeWorker` instance via `readPrecomputeConfig()`, call `worker.start()`, pass `worker` as a prop to `<InboxApp />`; call `worker.stop()` in the teardown after `waitUntilExit()` resolves to ensure graceful shutdown; update `src/tui/app.tsx` to accept the `worker` prop (typed as `PrecomputeWorker`) without yet wiring it to `useGmail`; write and pass integration test in `tests/integration/precompute-worker.test.ts` covering: real `EmailCache` in a `tmp` directory, mock `SummaryService`, worker processes all unsummarised emails in a 5-email fixture, persisted summaries survive a `cache.close()` + re-open + `getSummary()` round-trip, calling `stop()` mid-pass leaves already-written summaries intact and causes no cache corruption (depends on T003)

**Checkpoint**: US1 fully functional. Manual test per `quickstart.md` US1 section.

---

## Phase 4: User Story 2 — Worker Restarts After New Emails Are Fetched (Priority: P2)

**Goal**: Whenever `loadMore()` completes successfully (Ctrl-N), the worker cancels any in-progress pass and starts a fresh one from the top of the inbox.

**Independent Test**: Start the app, let the initial pass settle (10s). Press Ctrl-N. Wait 30s. Navigate to one of the newly-fetched emails and press 's'. Summary appears instantly, confirming the worker restarted and covered new arrivals.

- [x] T005 [US2] Implement `restart(): void` in `PrecomputeWorker` in `src/core/summary/precompute-worker.ts` (abort current pass if running, then immediately start a fresh pass); add `onEmailsFetched?: () => void` option to `useGmail` hook in `src/tui/hooks/useGmail.ts` and call it after a successful `loadMore()` response is merged into state; wire `() => worker.restart()` as `onEmailsFetched` in `src/tui/app.tsx`; write and pass unit tests in `tests/unit/summary/precompute-worker.test.ts` (for `restart()` scenarios) and `tests/unit/tui/useGmail.test.ts` (for `onEmailsFetched` callback scenarios) covering: `restart()` when running cancels current pass and starts a new one, `restart()` when idle acts like `start()`, `onEmailsFetched` is called after `loadMore()` succeeds, `onEmailsFetched` is NOT called if `loadMore()` throws (depends on T004)

**Checkpoint**: US1 + US2 complete. Ctrl-N triggers worker restart verified manually.

---

## Phase 5: User Story 3 — Configurable Coverage Limit (Priority: P3)

**Goal**: `SUMMARY_PRECOMPUTE_LIMIT` env var controls the per-pass target N. Default 500. Worker stops at the configured boundary.

**Independent Test**: Set `SUMMARY_PRECOMPUTE_LIMIT=5`, clear the cache, start the app. After 30s, first 5 emails have instant summaries; email #6+ shows ⏳.

- [x] T006 [P] [US3] Extend `tests/unit/summary/precompute-worker.test.ts` with explicit N-boundary end-to-end chain tests: given `SUMMARY_PRECOMPUTE_LIMIT=3` in `process.env`, `readPrecomputeConfig()` returns `coverageLimit=3`, worker constructed with that config fetches exactly 3 emails (not 4), stops after processing those 3; given `SUMMARY_PRECOMPUTE_LIMIT` unset, worker fetches up to 500; write each test first and confirm it fails before running the suite — if any test fails against existing code, fix the implementation before marking complete (depends on T003)

**Checkpoint**: N boundary verified by tests and manual quickstart step US3.

---

## Phase 6: User Story 4 — Configurable Maximum Depth Ceiling (Priority: P3)

**Goal**: `SUMMARY_PRECOMPUTE_MAX_DEPTH` env var sets an absolute position ceiling. When MAXIMUM_DEPTH < N, the effective depth is capped at MAXIMUM_DEPTH across all passes and restarts.

**Independent Test**: Set `SUMMARY_PRECOMPUTE_MAX_DEPTH=3`, `SUMMARY_PRECOMPUTE_LIMIT=10`. After worker runs, only first 3 emails have summaries; email #4+ never touched.

- [x] T007 [P] [US4] Extend `tests/unit/summary/precompute-worker.test.ts` with MAXIMUM_DEPTH boundary tests: given `maxDepth=2`, `coverageLimit=5`, `effectiveDepth=2` (maxDepth wins), worker fetches 2 emails not 5; given `maxDepth=10`, `coverageLimit=5`, `effectiveDepth=5` (coverageLimit wins); given `SUMMARY_PRECOMPUTE_MAX_DEPTH` unset, defaults to 500; restart after new fetch still respects maxDepth ceiling; write each test first and confirm it fails before running the suite — if any test fails against existing code, fix the implementation before marking complete (depends on T003)

**Checkpoint**: All 4 user stories complete. Both config boundaries verified by tests and manual quickstart steps US3 + US4.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end persistence verification and documentation.

- [x] T008 [P] Update `CLAUDE.md` active technologies section for feature `007-summary-precompute` to reflect the new `src/core/summary/precompute-worker.ts` module and the two new env vars (`SUMMARY_PRECOMPUTE_LIMIT`, `SUMMARY_PRECOMPUTE_MAX_DEPTH`); update project structure diagram in `CLAUDE.md` accordingly

- [ ] T009 [P] Run all `quickstart.md` manual verification steps for US1–US4 including SC-001 (worker starts within 5s), SC-002 (restart within 2s of Ctrl-N), and SC-005 (UI responsiveness during worker activity) — these three success criteria have no automated test coverage and are manual-only checks; confirm `npm test && npm run lint` passes clean with no regressions against previous feature tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - T003 and T004 are sequential (T004 depends on T003)
  - T005 depends on T004
  - T006 and T007 are independent of each other and of T005 (marked [P])
- **Polish (Phase 7)**: Depends on Phase 6 completion

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (T002). Path: T003 → T004
- **US2 (P2)**: Depends on US1 completion (T004). Path: T005
- **US3 (P3)**: Depends on T003 (core worker). Path: T006 (parallel with T007)
- **US4 (P3)**: Depends on T003 (core worker). Path: T007 (parallel with T006)

### Parallel Opportunities

```
                              ┌──► T006 [US3] ─┐
T001 → T002 → T003 → T004 ───┤                 ├─► T008 [P]
                    │         └──► T007 [US4] ─┘    T009 [P]
                    └──► T005 [US2]
```

T006 and T007 can be worked in parallel once T003 is done (even before T005):

```
                     ┌─► T006 [US3]
T003 ──► T004 ──► ───┤
                     └─► T007 [US4]

T004 ──► T005 [US2]
```

T008 and T009 are fully parallel in the polish phase.

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001 → T002 → T003 → T004
2. **Validate**: `npm test` all green; manual test per `quickstart.md` US1
3. Ship MVP — background precomputation running on startup

### Incremental Delivery

1. MVP (US1) → worker runs on startup
2. Add US2 (T005) → worker restarts on Ctrl-N
3. Add US3 + US4 (T006 + T007 in parallel) → configuration boundaries verified
4. Polish (T008 + T009) → docs updated, end-to-end verified

---

## Notes

- Each task: write failing tests first (stub), then implement until passing — never skip the red phase
- `[P]` = different files, safe to parallelize
- Commit after each task
- `npm test && npm run lint` must pass before moving to next task
- Mock `SummaryService` in all unit tests; use real `EmailCache` (tmp dir) only in integration tests
- Never make real AI API calls in unit or integration tests
