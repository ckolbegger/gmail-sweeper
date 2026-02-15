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

- [ ] T001 Install `openai` npm package as production dependency
- [ ] T002 Create `src/core/ai/` directory with barrel export in `src/core/ai/index.ts`
- [ ] T003 Create `src/core/filter/` directory with barrel export in `src/core/filter/index.ts`
- [ ] T004 [P] Create `tests/unit/ai/` directory structure
- [ ] T005 [P] Create `tests/unit/filter/` directory structure
- [ ] T006 Update `.env.example` with AI configuration variables (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MAX_CONTEXT_TOKENS`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: AI provider interface, config resolution, and prompt template that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T007 [P] Unit tests for `toConfidenceLevel()` mapping in `tests/unit/ai/confidence.test.ts` — test thresholds: ≥0.8→high, ≥0.5→medium, <0.5→low, boundary values 0.0, 0.5, 0.8, 1.0
- [ ] T008 [P] Unit tests for `resolveAiConfig()` in `tests/unit/ai/config.test.ts` — test: reads from env vars, missing AI_PROVIDER returns null, missing AI_API_KEY returns null, AI_MAX_CONTEXT_TOKENS defaults to 32000, AI_BASE_URL optional
- [ ] T009 [P] Unit tests for `createAiProvider()` factory in `tests/unit/ai/provider.test.ts` — test: creates AnthropicProvider for 'anthropic', creates OpenAiProvider for 'openai', throws on unsupported provider
- [ ] T010 [P] Unit tests for classification prompt template in `tests/unit/ai/prompt.test.ts` — test: builds prompt with filter description and email metadata array, output includes system instruction for JSON format, handles empty email list
- [ ] T011 [P] Unit tests for `estimateTokens()` and `calculateBatchSize()` in `tests/unit/ai/batch-sizing.test.ts` — test: chars/4 estimation, budget allocation (70% for emails), minimum batch size of 1, large emails get smaller batches, small emails get larger batches

### Implementation

- [ ] T012 [P] Implement `toConfidenceLevel()` in `src/core/ai/provider.ts` — map numeric confidence to high/medium/low per thresholds
- [ ] T013 [P] Implement `AiProvider` interface, `AiProviderConfig` type, and `createAiProvider()` factory in `src/core/ai/provider.ts`
- [ ] T014 [P] Implement `resolveAiConfig()` in `src/core/ai/config.ts` — read `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MAX_CONTEXT_TOKENS` from env vars, return `AiProviderConfig | null`
- [ ] T015 [P] Implement classification prompt template in `src/core/ai/prompt.ts` — system prompt enforcing JSON output, user prompt with filter description and email metadata array
- [ ] T016 Implement `estimateTokens()` and `calculateBatchSize()` in `src/core/filter/batch-sizing.ts` — token estimation (chars/4), budget allocation (70% for emails, 30% reserved), minimum 1 per batch
- [ ] T017 Add `AiProviderError` class in `src/core/errors.ts`

**Checkpoint**: Foundation ready — AI provider interface, config, prompt, and batch sizing available for all stories

---

## Phase 3: User Story 1 — Filter Inbox by Natural Language Description (Priority: P1) 🎯 MVP

**Goal**: User presses `f`, types a description, AI evaluates emails in token-aware batches, filtered list shows only matches with count

**Independent Test**: Enter a filter description against a known set of emails, verify matching emails appear and non-matching are hidden, with "Filtered: X/Y emails" shown

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T018 [P] [US1] Unit tests for `AnthropicProvider.classifyEmails()` in `tests/unit/ai/anthropic.test.ts` — mock Anthropic SDK, test: sends correct prompt, parses JSON response into EmailClassification[], handles malformed response, handles API error
- [x] T019 [P] [US1] Unit tests for `OpenAiProvider.classifyEmails()` in `tests/unit/ai/openai.test.ts` — mock OpenAI SDK, test: sends correct prompt, parses JSON response, handles malformed response, handles API error, respects baseUrl config
- [x] T020 [P] [US1] Unit tests for `runSmartFilter()` in `tests/unit/filter/smart-filter.test.ts` — mock AiProvider, test: splits emails into token-aware batches, calls onProgress after each batch, returns combined results sorted by confidence desc, respects AbortSignal cancellation, handles empty email list, rejects empty description (FR-013)
- [x] T021 [P] [US1] Unit tests for `useSmartFilter` hook in `tests/unit/cli/use-smart-filter.test.ts` — test: initial state is idle, activateFilter sets input mode, submitFilter triggers evaluation with loading state, successful evaluation updates filtered results, error preserves unfiltered view, clearFilter restores idle state, missing config shows error message (FR-017)
- [x] T022 [P] [US1] Unit tests for `FilterInput` component in `tests/unit/cli/filter-input.test.tsx` — ink-testing-library, test: renders text input, Enter submits value, displays loading indicator during evaluation (FR-004), displays error message on failure
- [ ] T023 [P] [US1] Unit tests for filter mode in `EmailList` in `tests/unit/cli/email-list.filter.test.tsx` — test: displays "Filtered: X/Y emails" count (FR-009), shows only matching emails, shows "No matches found" when empty (FR-005, acceptance scenario 4)
- [ ] T024 [US1] Integration test for full filter cycle in `tests/integration/smart-filter.test.ts` — mock AiProvider, test: activate filter → enter description → see loading → see filtered results with count → verify non-matching hidden

### Implementation for User Story 1

- [ ] T025 [P] [US1] Implement `AnthropicProvider` in `src/core/ai/anthropic.ts` — use @anthropic-ai/sdk, send classification prompt, parse JSON response into EmailClassification[]
- [ ] T026 [P] [US1] Implement `OpenAiProvider` in `src/core/ai/openai.ts` — use openai SDK, send classification prompt, parse JSON response, support baseUrl for compatible APIs
- [ ] T027 [US1] Implement `runSmartFilter()` in `src/core/filter/smart-filter.ts` — split emails using `calculateBatchSize()`, call provider per batch, accumulate results sorted by confidence desc, call onProgress after each batch, support AbortSignal, reject empty description
- [ ] T028 [US1] Implement `useSmartFilter` hook in `src/cli/hooks/use-smart-filter.ts` — manage filter state (idle/input/loading/filtered/error), call `resolveAiConfig()` and `createAiProvider()`, invoke `runSmartFilter()`, handle errors preserving unfiltered view
- [ ] T029 [US1] Implement `FilterInput` component in `src/cli/components/filter-input.tsx` — Ink TextInput for filter description, loading indicator (FR-004), error display
- [ ] T030 [US1] Update `EmailList` component in `src/cli/components/email-list.tsx` — accept optional `filterCount`/`totalCount` props, display "Filtered: X/Y emails" when active (FR-009), display "No matches found" message
- [ ] T031 [US1] Update `useKeyboard` hook in `src/cli/hooks/use-keyboard.ts` — add `f` key to activate filter mode (FR-001), add `Escape` key to clear filter (FR-007), disable navigation keys during filter input mode
- [ ] T032 [US1] Integrate smart filter into `InboxApp` in `src/cli/app.tsx` — wire `useSmartFilter` hook, show `FilterInput` when in input mode, pass filtered emails to `EmailList` when filter active, show filter description in header (FR-006), restore full list on clear (FR-008)
- [ ] T033 [US1] Update footer help text in `src/cli/app.tsx` — add `f` for filter and `Esc` to clear filter to keyboard shortcut hints

**Checkpoint**: User Story 1 fully functional — user can filter inbox by natural language, see progressive results, and return to full view

---

## Phase 4: User Story 2 — Clear Smart Filter and Return to Full Inbox (Priority: P1)

**Goal**: User presses Escape to clear active filter and immediately see all emails restored

**Independent Test**: Apply a smart filter, verify filtered results, press Escape, verify all emails restored and filter description removed

> **Note**: Core clear functionality is implemented in US1 (T028 clearFilter, T031 Escape key, T032 restore full list). This phase covers the edge cases and acceptance scenarios specific to the clear operation.

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

- [ ] T034 [P] [US2] Unit tests for clear filter edge cases in `tests/unit/cli/use-smart-filter.clear.test.ts` — test: clear during loading cancels in-progress evaluation (AbortSignal), clear removes filter description from display, clear when no filter active is a no-op (acceptance scenario 3), clear restores original email order
- [ ] T035 [US2] Integration test for clear filter in `tests/integration/smart-filter-clear.test.ts` — test: apply filter → verify filtered → clear → verify full list restored and no filter description shown

### Implementation for User Story 2

- [ ] T036 [US2] Implement cancellation-on-clear in `src/cli/hooks/use-smart-filter.ts` — when clearFilter called during loading, abort in-flight evaluation via AbortController, ensure no-op when no filter active

**Checkpoint**: User Story 2 complete — clear filter works in all states (idle, loading, filtered, error)

---

## Phase 5: User Story 3 — View Filter Match Confidence (Priority: P2)

**Goal**: Each email in the filtered list shows a confidence indicator (high/medium/low), results sorted by confidence

**Independent Test**: Apply a filter, verify each result displays a confidence indicator, verify results sorted by confidence (highest first)

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

- [ ] T037 [P] [US3] Unit tests for confidence indicator rendering in `tests/unit/cli/email-list.confidence.test.tsx` — test: high confidence shows green indicator, medium shows yellow, low shows dim, indicator appears next to email subject
- [ ] T038 [US3] Integration test for confidence display in `tests/integration/smart-filter-confidence.test.ts` — test: apply filter → results show confidence indicators → results ordered by confidence descending

### Implementation for User Story 3

- [ ] T039 [P] [US3] Update `EmailList` component in `src/cli/components/email-list.tsx` — accept optional `confidenceMap` prop (Map<emailId, ConfidenceLevel>), render colored confidence indicator (high=green, medium=yellow, low=dim) next to email subject when filter active
- [ ] T040 [US3] Wire confidence data from `useSmartFilter` to `EmailList` via `InboxApp` in `src/cli/app.tsx` — build confidenceMap from filter results, pass to EmailList

**Checkpoint**: All user stories functional — filter, clear, and confidence indicators working

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error hardening, and documentation

- [ ] T041 [P] Unit tests for edge cases in `tests/unit/filter/smart-filter.edge.test.ts` — test: vague description ("stuff") returns best-effort results, emails with no body (only subject/sender) are evaluated, very long email metadata handled by batch sizing
- [ ] T042 [P] Unit tests for AI error handling in `tests/unit/ai/error-handling.test.ts` — test: network timeout, rate limit (429), malformed JSON response, empty response, provider returns partial results
- [ ] T043 Handle progressive batch display in `src/cli/app.tsx` — update EmailList during evaluation as each batch completes (FR-014), show "Evaluating batch X/Y..." in status
- [ ] T044 Update `src/core/ai/index.ts` barrel export with all public types and functions
- [ ] T045 Update `src/core/filter/index.ts` barrel export with all public types and functions
- [ ] T046 Run quickstart.md validation — verify development setup instructions work end-to-end

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
- **User Story 2 (P1)**: Depends on US1 core implementation (T028 useSmartFilter, T031 Escape key)
- **User Story 3 (P2)**: Depends on US1 filter results being available — can run parallel with US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Provider interface before provider implementations
- Core filter logic before TUI integration
- Hook before component
- Component before app integration

### Parallel Opportunities

- T004/T005: test directories created in parallel
- T007–T011: all foundational tests in parallel
- T012–T016: foundational implementations in parallel (after their tests pass)
- T018–T023: all US1 tests in parallel
- T025/T026: both provider implementations in parallel
- T034/T035 and T037/T038: US2 and US3 tests can run in parallel
- T041/T042: edge case and error handling tests in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (MANDATORY - write FIRST):
Task: "Unit tests for AnthropicProvider in tests/unit/ai/anthropic.test.ts"
Task: "Unit tests for OpenAiProvider in tests/unit/ai/openai.test.ts"
Task: "Unit tests for runSmartFilter in tests/unit/filter/smart-filter.test.ts"
Task: "Unit tests for useSmartFilter hook in tests/unit/tui/useSmartFilter.test.ts"
Task: "Unit tests for FilterInput in tests/unit/tui/FilterInput.test.tsx"
Task: "Unit tests for EmailList filter mode in tests/unit/tui/EmailList.filter.test.tsx"

# Then launch parallel implementations:
Task: "Implement AnthropicProvider in src/core/ai/anthropic.ts"
Task: "Implement OpenAiProvider in src/core/ai/openai.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test full filter cycle end-to-end
5. Demo: user can filter inbox by natural language

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test clear filter → Demo
4. Add User Story 3 → Test confidence indicators → Demo
5. Polish → Edge cases, error handling, documentation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution II mandates: Write Test → Fail → Write Code → Pass → Refactor
