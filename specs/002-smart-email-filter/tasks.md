# Tasks: Smart Email Filter

**Input**: Design documents from `/specs/002-smart-email-filter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create module scaffolding

- [x] T001 Install `openai` npm package as production dependency
- [x] T002 Create `src/core/ai/` directory with barrel export in `src/core/ai/index.ts`
- [x] T003 Create `src/core/filter/` directory with barrel export in `src/core/filter/index.ts`
- [x] T004 [P] Create `tests/unit/ai/` directory structure
- [x] T005 [P] Create `tests/unit/filter/` directory structure
- [x] T006 Update `.env.example` with AI configuration variables (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MAX_CONTEXT_TOKENS`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: AI provider interface, config resolution, and prompt template that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] Unit tests for `toConfidenceLevel()` mapping in `tests/unit/ai/confidence.test.ts` — test thresholds: ≥0.8→high, ≥0.5→medium, <0.5→low, boundary values 0.0, 0.5, 0.8, 1.0
- [x] T008 [P] Unit tests for `resolveAiConfig()` in `tests/unit/ai/config.test.ts` — test: reads from env vars, missing AI_PROVIDER returns null, missing AI_API_KEY returns null, AI_MAX_CONTEXT_TOKENS defaults to 32000, AI_BASE_URL optional
- [x] T009 [P] Unit tests for `createAiProvider()` factory in `tests/unit/ai/provider.test.ts` — test: creates AnthropicProvider for 'anthropic', creates OpenAiProvider for 'openai', throws on unsupported provider
- [x] T010 [P] Unit tests for classification prompt template in `tests/unit/ai/prompt.test.ts` — test: builds prompt with filter description and email metadata array, output includes system instruction for JSON format, handles empty email list
- [x] T011 [P] Unit tests for `estimateTokens()` and `calculateBatchSize()` in `tests/unit/ai/batch-sizing.test.ts` — test: chars/4 estimation, budget allocation (70% for emails), minimum batch size of 1, large emails get smaller batches, small emails get larger batches

### Implementation

- [x] T012 [P] Implement `toConfidenceLevel()` in `src/core/ai/provider.ts` — map numeric confidence to high/medium/low per thresholds
- [x] T013 [P] Implement `AiProvider` interface, `AiProviderConfig` type, and `createAiProvider()` factory in `src/core/ai/provider.ts`
- [x] T014 [P] Implement `resolveAiConfig()` in `src/core/ai/config.ts` — read `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MAX_CONTEXT_TOKENS` from env vars, return `AiProviderConfig | null`
- [x] T015 [P] Implement classification prompt template in `src/core/ai/prompt.ts` — system prompt enforcing JSON output, user prompt with filter description and email metadata array
- [x] T016 Implement `estimateTokens()` and `calculateBatchSize()` in `src/core/filter/batch-sizing.ts` — token estimation (chars/4), budget allocation (70% for emails, 30% reserved), minimum 1 per batch
- [x] T017 Add `AiProviderError` class in `src/core/errors.ts`

**Checkpoint**: Foundation ready — AI provider interface, config, prompt, and batch sizing available for all stories

---

## Phase 3: User Story 1 — Filter Inbox by Natural Language Description (Priority: P1) 🎯 MVP

**Goal**: User presses `f`, types a description, AI evaluates emails in token-aware batches, filtered list shows only matches with count

**Independent Test**: Enter a filter description against a known set of emails, verify matching emails appear and non-matching are hidden, with "Filtered: X/Y emails" shown

**Approach**: Each task follows TDD — write tests first, verify they fail, then implement until green.

- [x] T018 [P] [US1] TDD `AnthropicProvider.classifyEmails()` — tests in `tests/unit/ai/anthropic.test.ts`, impl in `src/core/ai/anthropic.ts`. Mock Anthropic SDK, test: sends correct prompt, parses JSON response into EmailClassification[], handles malformed response, handles API error. Implement using @anthropic-ai/sdk, send classification prompt, parse JSON response.
- [x] T019 [P] [US1] TDD `OpenAiProvider.classifyEmails()` — tests in `tests/unit/ai/openai.test.ts`, impl in `src/core/ai/openai.ts`. Mock OpenAI SDK, test: sends correct prompt, parses JSON response, handles malformed response, handles API error, respects baseUrl config. Implement using openai SDK, support baseUrl for compatible APIs.
- [x] T020 [P] [US1] TDD `runSmartFilter()` — tests in `tests/unit/filter/smart-filter.test.ts`, impl in `src/core/filter/smart-filter.ts`. Mock AiProvider, test: splits emails into token-aware batches, calls onProgress after each batch, returns combined results sorted by confidence desc, respects AbortSignal cancellation, handles empty email list, rejects empty description (FR-013). Implement using `calculateBatchSize()`, call provider per batch, accumulate results.
- [x] T021 [P] [US1] TDD `useSmartFilter` hook — tests in `tests/unit/tui/useSmartFilter.test.ts`, impl in `src/tui/hooks/useSmartFilter.ts`. Test: initial state is idle, activateFilter sets input mode, submitFilter triggers evaluation with loading state, successful evaluation updates filtered results, error preserves unfiltered view, clearFilter restores idle state, missing config shows error message (FR-017). Implement state machine (idle/input/loading/filtered/error), call `resolveAiConfig()` and `createAiProvider()`, invoke `runSmartFilter()`.
- [x] T022 [P] [US1] TDD `FilterInput` component — tests in `tests/unit/tui/FilterInput.test.tsx`, impl in `src/tui/components/FilterInput.tsx`. ink-testing-library, test: renders text input, Enter submits value, displays loading indicator during evaluation (FR-004), displays error message on failure. Implement Ink TextInput for filter description, loading indicator, error display.
- [x] T023 [P] [US1] TDD `EmailList` filter mode — tests in `tests/unit/tui/EmailList.filter.test.tsx`, update `src/tui/components/EmailList.tsx`. Test: displays "Filtered: X/Y emails" count (FR-009), shows only matching emails, shows "No matches found" when empty (FR-005, acceptance scenario 4). Add optional `filterCount`/`totalCount` props.
- [x] T024 [US1] Update `useKeyboard` hook in `src/tui/hooks/useKeyboard.ts` — add `f` key to activate filter mode (FR-001), add `Escape` key to clear filter (FR-007), disable navigation keys during filter input mode
- [x] T025 [US1] Integrate smart filter into `InboxApp` in `src/tui/app.tsx` — wire `useSmartFilter` hook, show `FilterInput` when in input mode, pass filtered emails to `EmailList` when filter active, show filter description in header (FR-006), restore full list on clear (FR-008), update footer help text with `f` for filter and `Esc` to clear
- [x] T026 [US1] Integration test for full filter cycle in `tests/integration/smart-filter.test.ts` — mock AiProvider, test: activate filter → enter description → see loading → see filtered results with count → verify non-matching hidden

### Enhancements

- [x] T026a [US1] TDD filter progress indicator — tests in `tests/unit/tui/FilterInput.test.tsx` and `tests/unit/tui/useSmartFilter.test.ts`, update `src/tui/hooks/useSmartFilter.ts`, `src/tui/components/FilterInput.tsx`, `src/tui/app.tsx`. Add progress state (evaluatedCount/totalCount/percent) to useSmartFilter by wiring onProgress callback to runSmartFilter. Update FilterInput to show progress next to spinner: "7/70 — 10% complete". Tests: hook exposes progress during loading, progress updates after each batch, FilterInput renders progress text when provided, shows "Evaluating..." when no progress yet.
- [x] T026b [P] TDD `--max-emails` CLI arg — Add `-n, --max-emails <count>` option to CLI (`src/cli/index.ts`), wire through `launchTUI` → `InboxApp` → `useGmail` as `initialLoadSize`. Also add `--max-context-tokens <count>` CLI arg to override `AI_MAX_CONTEXT_TOKENS` env var. Tests: CLI parsing in `tests/unit/cli/index.test.ts`, integration plumbing in `tests/unit/tui/useGmail.test.ts`. Three sub-tasks:
  - T026b-1 [P] CLI arg parsing: Add `--max-emails` and `--max-context-tokens` to `parseArgs()` and `CLIOptions` in `src/cli/index.ts`, tests in `tests/unit/cli/index.test.ts`
  - T026b-2 [P] TUI plumbing: Add `maxEmails` prop to `launchTUI()` in `src/tui/index.tsx`, `InboxApp` in `src/tui/app.tsx`, pass as `initialLoadSize` to `useGmail`. Add `maxContextTokens` prop to `InboxApp` and pass to `useSmartFilter`. Tests in `tests/unit/tui/useGmail.test.ts`
  - T026b-3 Wire CLI → TUI: Connect parsed CLI args to `launchTUI()` call in `main()` of `src/cli/index.ts`

### Bug Fixes

- [x] T018-BUG-1 [US1] Fix empty filter description not rejected before AI config check — `src/tui/hooks/useSmartFilter.ts`, `tests/unit/tui/useSmartFilter.test.ts`. See `specs/002-smart-email-filter/US1-bug-1.md`.
- [x] T018-BUG-2 [US1] Fix "AI provider not configured" error lacks configuration guidance — `src/tui/hooks/useSmartFilter.ts`, `tests/unit/tui/useSmartFilter.test.ts`. See `specs/002-smart-email-filter/US1-bug-2.md`.
- [x] T018-BUG-3 [US1] Fix selection index not reset when switching between filtered/unfiltered views — `src/tui/hooks/useKeyboard.ts`, `tests/unit/tui/useKeyboard.test.ts`. See `specs/002-smart-email-filter/US1-bug-3.md`.

**Checkpoint**: User Story 1 fully functional — user can filter inbox by natural language, see progressive results, and return to full view

---

## Phase 4: User Story 2 — Clear Smart Filter and Return to Full Inbox (Priority: P1)

**Goal**: User presses Escape to clear active filter and immediately see all emails restored

**Independent Test**: Apply a smart filter, verify filtered results, press Escape, verify all emails restored and filter description removed

> **Note**: Core clear functionality is implemented in US1 (T021 useSmartFilter clearFilter, T024 Escape key, T025 restore full list). This phase covers the edge cases and acceptance scenarios specific to the clear operation.

- [x] T027 [US2] TDD clear filter edge cases — tests in `tests/unit/tui/useSmartFilter.clear.test.ts`, impl cancellation-on-clear in `src/tui/hooks/useSmartFilter.ts`. Test: clear during loading cancels in-progress evaluation (AbortSignal), clear removes filter description from display, clear when no filter active is a no-op (acceptance scenario 3), clear restores original email order. Implement AbortController cancellation on clearFilter.
- [x] T028 [US2] Integration test for clear filter in `tests/integration/smart-filter-clear.test.ts` — test: apply filter → verify filtered → clear → verify full list restored and no filter description shown

**Checkpoint**: User Story 2 complete — clear filter works in all states (idle, loading, filtered, error)

---

## Phase 5: User Story 3 — View Filter Match Confidence (Priority: P2)

**Goal**: Each email in the filtered list shows a confidence indicator (high/medium/low), results sorted by confidence

**Independent Test**: Apply a filter, verify each result displays a confidence indicator, verify results sorted by confidence (highest first)

- [ ] T029 [US3] TDD confidence indicator rendering — tests in `tests/unit/tui/EmailList.confidence.test.tsx`, update `src/tui/components/EmailList.tsx`. Test: high confidence shows green indicator, medium shows yellow, low shows dim, indicator appears next to email subject. Add optional `confidenceMap` prop (Map<emailId, ConfidenceLevel>), render colored indicators when filter active.
- [ ] T030 [US3] Wire confidence data and integration test — wire `useSmartFilter` confidence data to `EmailList` via `InboxApp` in `src/tui/app.tsx`, integration test in `tests/integration/smart-filter-confidence.test.ts`: apply filter → results show confidence indicators → results ordered by confidence descending

**Checkpoint**: All user stories functional — filter, clear, and confidence indicators working

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error hardening, and documentation

- [ ] T031 [P] TDD edge cases and error handling — tests in `tests/unit/filter/smart-filter.edge.test.ts` and `tests/unit/ai/error-handling.test.ts`. Edge cases: vague description ("stuff") returns best-effort results, emails with no body (only subject/sender) are evaluated, very long email metadata handled by batch sizing. Error handling: network timeout, rate limit (429), malformed JSON response, empty response, provider returns partial results.
- [ ] T032 Handle progressive batch display in `src/tui/app.tsx` — update EmailList during evaluation as each batch completes (FR-014), show "Evaluating batch X/Y..." in status
- [ ] T033 Update barrel exports — `src/core/ai/index.ts` and `src/core/filter/index.ts` with all public types and functions
- [ ] T034 Run quickstart.md validation — verify development setup instructions work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — this is the MVP
- **US2 (Phase 4)**: Depends on US1 (clear filter requires filter to exist)
- **US3 (Phase 5)**: Depends on US1 (confidence display requires filter results)
- **Polish (Phase 6)**: Depends on US1, can overlap with US2/US3

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 core implementation (T021 useSmartFilter, T024 Escape key)
- **User Story 3 (P2)**: Depends on US1 filter results being available — can run parallel with US2

### Within Each User Story

- Each task follows TDD: Write Test → Fail → Implement → Pass
- Core logic before TUI integration
- Hook before component
- Component before app integration

### Parallel Opportunities

- T018/T019: Both provider TDD tasks in parallel (different files)
- T020/T021/T022/T023: Core filter, hook, FilterInput, EmailList TDD in parallel (different files)
- T029/T030: US3 tasks can overlap with US2 (T027/T028)

---

## Parallel Example: User Story 1

```bash
# Batch 1: Provider implementations (parallel, no dependencies)
Task: "TDD AnthropicProvider — tests/unit/ai/anthropic.test.ts + src/core/ai/anthropic.ts"
Task: "TDD OpenAiProvider — tests/unit/ai/openai.test.ts + src/core/ai/openai.ts"

# Batch 2: Core logic + TUI components (parallel, no dependencies between them)
Task: "TDD runSmartFilter — tests/unit/filter/smart-filter.test.ts + src/core/filter/smart-filter.ts"
Task: "TDD useSmartFilter hook — tests/unit/tui/useSmartFilter.test.ts + src/tui/hooks/useSmartFilter.ts"
Task: "TDD FilterInput — tests/unit/tui/FilterInput.test.tsx + src/tui/components/FilterInput.tsx"
Task: "TDD EmailList filter mode — tests/unit/tui/EmailList.filter.test.tsx + src/tui/components/EmailList.tsx"

# Batch 3: Integration (sequential, depends on batch 1+2)
Task: "Update useKeyboard hook"
Task: "Integrate into InboxApp"
Task: "Integration test for full filter cycle"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✅
2. Complete Phase 2: Foundational ✅
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test full filter cycle end-to-end
5. Demo: user can filter inbox by natural language

### Incremental Delivery

1. Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test clear filter → Demo
4. Add User Story 3 → Test confidence indicators → Demo
5. Polish → Edge cases, error handling, documentation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each task is self-contained TDD: tests + implementation together
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution II mandates: Write Test → Fail → Write Code → Pass → Refactor
