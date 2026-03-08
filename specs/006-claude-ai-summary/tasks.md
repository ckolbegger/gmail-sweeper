# Tasks: AI Email Summary

**Input**: Design documents from `/specs/006-claude-ai-summary/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**TDD Approach**: Each task includes writing tests against a stub implementation first, then iterating until all tests pass. Tests and implementation are a single unit of work — not separated.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stub out the new `src/core/summary/` module so it can be referenced by other tasks.

- [ ] T001 Create `src/core/summary/index.ts` as empty barrel stub (enables TypeScript imports in subsequent tasks)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and cache layer that every user story depends on.

**⚠️ CRITICAL**: Phases 3–5 cannot begin until this phase is complete.

- [ ] T002 Add `EmailSummary` interface to `src/core/models/index.ts`; add `email_summaries` table (schema in `data-model.md`) + `getSummary(emailId)` and `setSummary(emailId, summary)` methods to `src/core/cache/db.ts`; write and pass unit tests in `tests/unit/cache/summary-cache.test.ts` covering: table created on init, upsert+retrieve round-trip, missing entry returns null, overwrite updates existing summary

**Checkpoint**: `EmailSummary` type importable; cache read/write verified by tests.

---

## Phase 3: User Story 1 — Generate and View AI Summary (Priority: P1) 🎯 MVP

**Goal**: User presses 's' on a selected email and sees an AI-generated one-sentence description + action-item bullets in the detail panel.

**Independent Test**: Open any email, press 's', confirm the detail panel renders a summary (mocked AI in unit tests; real AI in manual verification per `quickstart.md`).

- [ ] T003 [P] [US1] Implement `buildSummaryPrompt(email)` and `parseSummaryResponse(raw)` in `src/core/summary/prompt.ts`; write and pass unit tests in `tests/unit/summary/prompt.test.ts` covering: prompt includes subject + body, parse extracts one-sentence + action items, parse handles "- None" → empty array, parse handles missing blank line gracefully, empty `oneSentence` throws `SummaryGenerationError`

- [ ] T004 [US1] Implement `SummaryService` class in `src/core/summary/service.ts` (uses `AiProviderConfig` + `AnthropicProvider`/`OpenAiProvider` per `contracts/summary-service.md`); export from `src/core/summary/index.ts`; write and pass unit tests in `tests/unit/summary/service.test.ts` covering: `summarize()` calls AI with correct prompt, returns parsed `EmailSummary`, wraps AI errors in `SummaryGenerationError`, passes email body to prompt builder (depends on T003)

- [ ] T005 [US1] Implement `useEmailSummary` hook in `src/tui/hooks/useEmailSummary.ts` per `contracts/use-email-summary.md`; write and pass unit tests in `tests/unit/tui/useEmailSummary.test.ts` covering all 8 behaviour scenarios in the contract: cache hit → `ready` without AI call, cache miss → `loading` → `ready`, AI failure → `error` with message, no-op when already loading, `reset()` returns to `idle` (depends on T002, T004)

- [ ] T006 [P] [US1] Extend `EmailPreview` props with `viewMode` and `summaryState` in `src/tui/components/EmailPreview.tsx`; render summary header + one-sentence + bullet list when `viewMode === 'summary'` and `status === 'ready'`; write and pass component tests in `tests/unit/tui/EmailPreview.summary.test.tsx` covering: `viewMode='full'` renders full email unchanged, `status='ready'` renders one-sentence + bullets, `status='ready'` with empty action items renders "(No action items)", `[s] full view` hint visible in summary mode (depends on T002)

- [ ] T007 [US1] Wire the complete US1 flow in `src/tui/app.tsx` and `src/tui/hooks/useKeyboard.ts`: add `onToggleSummary` option + `'s'` key binding to `useKeyboard`; add `detailViewMode` state + `useEmailSummary` hook + `handleToggleSummary` callback to `app.tsx`; pass `viewMode` + `summaryState` to `EmailPreview`; add `'s' summary` to footer hint; write and pass integration-style unit tests covering: 's' key triggers `onToggleSummary`, 's' is no-op when `itemCount === 0`, `EmailPreview` receives correct `viewMode` prop (depends on T005, T006)

**Checkpoint**: US1 fully functional. Manual test: press 's' on any email → summary appears.

---

## Phase 4: User Story 2 — Return to Full Email View (Priority: P2)

**Goal**: From summary view, pressing 's' restores the full email. Navigating to a different email also resets to full view.

**Independent Test**: With summary view active, press 's' → full email reappears. Navigate away → new email shows full view by default.

- [ ] T008 [US2] Extend `tests/unit/tui/useEmailSummary.test.ts` with `reset()` scenarios; extend `tests/unit/tui/EmailPreview.summary.test.tsx` with `viewMode='full'` after toggle-back; extend `useKeyboard` test to verify second 's' press calls `onToggleSummary` again; ensure `useEffect` in `src/tui/app.tsx` calls `emailSummary.reset()` and sets `detailViewMode` back to `'full'` on email change — make all new tests pass (depends on T007)

**Checkpoint**: US1 + US2 complete. Toggle is fully bidirectional. Navigation resets to full view.

---

## Phase 5: User Story 3 — Loading Feedback While Summary Generates (Priority: P3)

**Goal**: User sees a loading indicator while the AI generates a summary for the first time, and a recoverable error message if generation fails.

**Independent Test**: Press 's' on an email with no cached summary → `⏳ Generating summary...` visible before summary appears. Simulated AI failure → `⚠ ...` error message with retry instruction visible.

- [ ] T009 [US3] Extend `src/tui/components/EmailPreview.tsx` to render `⏳ Generating summary...` when `status === 'loading'` and `⚠ {error}. Press 's' to retry.` when `status === 'error'`; extend `tests/unit/tui/EmailPreview.summary.test.tsx` with `status='loading'` and `status='error'` rendering tests; extend `tests/unit/tui/useEmailSummary.test.ts` with retry-after-error scenario (pressing 's' again after error transitions back to `loading`); make all new tests pass (depends on T007)

**Checkpoint**: All 3 user stories complete. App is fully functional per spec.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end persistence verification and documentation.

- [ ] T010 Write and pass integration test in `tests/integration/summary-persistence.test.ts` covering: generate summary → close `EmailCache` → re-open → verify `getSummary` returns same data (validates FR-008 "persist across sessions")

- [ ] T011 [P] Update `CLAUDE.md` active technologies section for feature `006-claude-ai-summary` to reflect the new `src/core/summary/` module; confirm `quickstart.md` manual verification steps work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion
  - T003 and T006 are independent of each other within Phase 3 (marked [P])
  - T004 depends on T003; T005 depends on T002 + T004; T007 depends on T005 + T006
- **Polish (Phase 6)**: Depends on Phase 5 completion

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (T002). Core path: T003 → T004 → T005 → T007 (T006 parallel to T003–T004)
- **US2 (P2)**: Depends on US1 completion (T007)
- **US3 (P3)**: Depends on US1 completion (T007)

### Parallel Opportunities

Within Phase 3:
```
T003 (prompt.ts) ─┐
                   ├─► T004 (service.ts) ─► T005 (hook) ─► T007 (app wiring)
T006 (preview) ───┘
```

T003 and T006 can be worked in parallel immediately after Phase 2.

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001 → T002 → T003+T006 (parallel) → T004 → T005 → T007
2. **Validate**: `npm test` all green; manual 's' key test per `quickstart.md`
3. Ship MVP — summary generation + display working

### Incremental Delivery

1. MVP (US1) → users can generate and view summaries
2. Add US2 (T008) → bidirectional toggle + auto-reset on navigation
3. Add US3 (T009) → loading/error feedback
4. Polish (T010–T011) → persistence verified, docs updated

---

## Notes

- Each task: write failing tests first (stub), then implement until passing — never skip the red phase
- `[P]` = different files, safe to parallelize
- Commit after each task (or T003+T006 together if worked in parallel)
- `npm test && npm run lint` must pass before moving to next task
- Suggested model for AI calls in tests: mock `AiProvider`; never make real API calls in unit/integration tests
