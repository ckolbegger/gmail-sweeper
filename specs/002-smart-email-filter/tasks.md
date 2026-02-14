# Tasks: Smart Email Filter

**Input**: Design documents from `/specs/002-smart-email-filter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create module scaffolding

- [ ] T001 Install production/runtime deps: `openai`, `@anthropic-ai/sdk`, `react`, `@types/react`, `ink-testing-library`
- [ ] T002 Update TypeScript config for TSX (`jsx: react-jsx`) in `tsconfig.json`
- [ ] T003 Create `src/adapters/ai/` with barrel export in `src/adapters/ai/index.ts`
- [ ] T004 Create `src/services/smart_filter_service.ts`, `src/services/batch_sizing.ts`, and `src/services/index.ts`
- [ ] T005 [P] Create TUI TSX scaffolding files `src/tui/filter_input.tsx` and `src/tui/use_smart_filter.ts`
- [ ] T006 Create `.env.example` with AI configuration variables (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MAX_CONTEXT_TOKENS`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: AI provider interface, config resolution, prompt template, and batch sizing used by all stories

**CRITICAL**: No user story work can begin until this phase is complete.

### Tests (MANDATORY - Strict TDD)

- [ ] T007 [P] Unit tests for `toConfidenceLevel()` mapping in `tests/unit/ai_confidence.test.ts`
- [ ] T008 [P] Unit tests for `resolveAiConfig()` in `tests/unit/ai_config.test.ts`
- [ ] T009 [P] Unit tests for `createAiProvider()` factory in `tests/unit/ai_provider_factory.test.ts`
- [ ] T010 [P] Unit tests for classification prompt builder in `tests/unit/ai_prompt.test.ts`
- [ ] T011 [P] Unit tests for `estimateTokens()` and `calculateBatchSize()` in `tests/unit/batch_sizing.test.ts`

### Implementation

- [ ] T012 [P] Implement `toConfidenceLevel()`, provider types, and `createAiProvider()` in `src/adapters/ai/provider.ts`
- [ ] T013 [P] Implement `resolveAiConfig()` in `src/core/config.ts` (optional AI config; null when not configured)
- [ ] T014 [P] Implement classification prompt template in `src/adapters/ai/prompt.ts`
- [ ] T015 Implement `estimateTokens()` and `calculateBatchSize()` in `src/services/batch_sizing.ts`
- [ ] T016 Add `AiProviderError` in `src/core/errors.ts`
- [ ] T017 Export adapter/service modules via `src/adapters/ai/index.ts` and `src/services/index.ts`

**Checkpoint**: Foundation ready — provider interface, config, prompt, and batch sizing are available.

---

## Phase 3: User Story 1 - Filter Inbox by Natural Language Description (Priority: P1) 🎯 MVP

**Goal**: User presses `f`, enters a description, AI evaluates loaded emails in token-aware batches, and filtered results are shown with counts.

**Independent Test**: Enter a description against known emails and verify matches/non-matches plus "Filtered: X/Y emails" status.

### Tests for User Story 1 (MANDATORY - Strict TDD)

- [ ] T018 [P] [US1] Unit tests for `AnthropicProvider.classifyEmails()` in `tests/unit/anthropic_provider.test.ts`
- [ ] T019 [P] [US1] Unit tests for `OpenAiProvider.classifyEmails()` in `tests/unit/openai_provider.test.ts`
- [ ] T020 [P] [US1] Unit tests for `runSmartFilter()` in `tests/unit/smart_filter_service.test.ts`
- [ ] T021 [P] [US1] Unit tests for `useSmartFilter` in `tests/unit/use_smart_filter.test.ts`
- [ ] T022 [P] [US1] Unit tests for `FilterInput` in `tests/unit/filter_input.test.tsx`
- [ ] T023 [P] [US1] Unit tests for filter mode in `inbox_list` in `tests/unit/inbox_list.filter.test.tsx`
- [ ] T024 [US1] Integration test for full filter cycle in `tests/integration/smart_filter_flow.test.ts`

### Implementation for User Story 1

- [ ] T025 [P] [US1] Implement `AnthropicProvider` in `src/adapters/ai/anthropic.ts`
- [ ] T026 [P] [US1] Implement `OpenAiProvider` in `src/adapters/ai/openai.ts`
- [ ] T027 [US1] Implement `runSmartFilter()` in `src/services/smart_filter_service.ts`
- [ ] T028 [US1] Implement `useSmartFilter` in `src/tui/use_smart_filter.ts`
- [ ] T029 [US1] Implement `FilterInput` in `src/tui/filter_input.tsx`
- [ ] T030 [US1] Update inbox list rendering with filter counts/empty state in `src/tui/inbox_list.tsx`
- [ ] T031 [US1] Update keyboard handling for `f`/`Esc` in `src/tui/input_controller.ts`
- [ ] T032 [US1] Integrate smart filter state/UI in `src/tui/app.tsx`
- [ ] T033 [US1] Update footer/help text in `src/tui/app.tsx` for filter shortcuts

**Checkpoint**: User Story 1 functional and independently testable.

---

## Phase 4: User Story 2 - Clear Smart Filter and Return to Full Inbox (Priority: P1)

**Goal**: User presses Escape to clear active filter and immediately return to full list.

**Independent Test**: Apply filter, verify filtered view, clear filter, verify full list + no active filter description.

### Tests for User Story 2 (MANDATORY - Strict TDD)

- [ ] T034 [P] [US2] Unit tests for clear edge cases in `tests/unit/use_smart_filter.clear.test.ts`
- [ ] T035 [US2] Integration test for clear flow in `tests/integration/smart_filter_clear.test.ts`

### Implementation for User Story 2

- [ ] T036 [US2] Implement cancellation-on-clear in `src/tui/use_smart_filter.ts` with `AbortController`

**Checkpoint**: User Story 2 complete.

---

## Phase 5: User Story 3 - View Filter Match Confidence (Priority: P2)

**Goal**: Filtered results show confidence indicators and are sorted highest confidence first.

**Independent Test**: Apply filter and verify indicators + ordering.

### Tests for User Story 3 (MANDATORY - Strict TDD)

- [ ] T037 [P] [US3] Unit tests for confidence indicator rendering in `tests/unit/inbox_list.confidence.test.tsx`
- [ ] T038 [US3] Integration test for confidence display in `tests/integration/smart_filter_confidence.test.ts`

### Implementation for User Story 3

- [ ] T039 [P] [US3] Add confidence indicator rendering in `src/tui/inbox_list.tsx`
- [ ] T040 [US3] Wire confidence map from filter state to list rendering in `src/tui/app.tsx`

**Checkpoint**: All user stories complete for smart filtering.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error hardening, and documentation

- [ ] T041 [P] Unit tests for edge cases in `tests/unit/smart_filter_edge.test.ts`
- [ ] T042 [P] Unit tests for AI error handling in `tests/unit/ai_error_handling.test.ts`
- [ ] T043 Progressive batch status updates in `src/tui/app.tsx` ("Evaluating batch X/Y")
- [ ] T044 Finalize `src/adapters/ai/index.ts` public exports
- [ ] T045 Finalize `src/services/index.ts` public exports
- [ ] T046 Run quickstart validation from `specs/002-smart-email-filter/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies
- Foundational (Phase 2): depends on Setup; blocks all stories
- US1 (Phase 3): depends on Foundational
- US2 (Phase 4): depends on US1 core filter behavior
- US3 (Phase 5): depends on US1 filter results
- Polish (Phase 6): can proceed after US1 and continue with US2/US3

### User Story Dependencies

- US1: independent after Foundational
- US2: depends on US1 clear flow primitives
- US3: depends on US1 classification result pipeline

### Within Each User Story

- Write tests first and verify failure
- Implement minimal code to pass
- Refactor with all tests green

### Parallel Opportunities

- T007-T011 can run in parallel
- T018-T023 can run in parallel
- T025/T026 can run in parallel
- T034/T037 can run in parallel
- T041/T042 can run in parallel

---

## Notes

- [P] tasks indicate independent file-level parallelism.
- Maintain strict TDD loop for every task.
- Stop at each checkpoint for independent validation.
