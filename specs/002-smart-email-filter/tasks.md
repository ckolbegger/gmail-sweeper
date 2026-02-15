# Tasks: Smart Email Filter

**Input**: Design documents from `specs/002-smart-email-filter/`
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

- [ ] T001 [P] Install `@anthropic-ai/sdk` and `openai` npm packages
- [ ] T002 Create `src/services/ai/` directory structure
- [ ] T003 Create `src/services/filter/` directory structure
- [ ] T004 [P] Create `tests/unit/services/ai/` directory structure
- [ ] T005 [P] Create `tests/unit/services/filter/` directory structure
- [ ] T006 Update `.env` handling to include `AI_PROVIDER` (gemini|anthropic|openai), `AI_MODEL`, and necessary keys

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: AI provider interface, config resolution, and prompt template

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (MANDATORY - Strict TDD) ⚠️

- [ ] T007 [P] Unit tests for `toConfidenceLevel()` mapping in `tests/unit/services/ai/confidence.test.ts`
- [ ] T008 [P] Unit tests for `resolveAiConfig()` in `tests/unit/services/ai/config.test.ts`
- [ ] T009 [P] Unit tests for `createAiProvider()` factory in `tests/unit/services/ai/provider.test.ts`
- [ ] T010 [P] Unit tests for classification prompt template in `tests/unit/services/ai/prompt.test.ts`
- [ ] T011 [P] Unit tests for `estimateTokens()` and `calculateBatchSize()` in `tests/unit/services/filter/batch-sizing.test.ts`

### Implementation

- [ ] T012 [P] Implement `toConfidenceLevel()` in `src/services/ai/provider.ts`
- [ ] T013 [P] Implement `AiProvider` interface and `createAiProvider()` factory in `src/services/ai/provider.ts`
- [ ] T014 [P] Implement `resolveAiConfig()` in `src/services/ai/config.ts`
- [ ] T015 [P] Implement classification prompt template in `src/services/ai/prompt.ts`
- [ ] T016 Implement `estimateTokens()` and `calculateBatchSize()` in `src/services/filter/batchSizing.ts`

**Checkpoint**: Foundation ready — AI abstraction layer available

---

## Phase 3: User Story 1 — Filter Inbox by Natural Language Description (Priority: P1) 🎯 MVP

**Goal**: User activates filter, types description, AI evaluates in batches, list updates with results.

**Independent Test**: Enter filter "receipts", verify only receipts appear with "Filtered: X/Y" status.

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

- [x] T017 [P] [US1] Unit tests for `GeminiProvider.classifyEmails()` in `tests/unit/services/ai/gemini.test.ts`
- [x] T018 [P] [US1] Unit tests for `runSmartFilter()` in `tests/unit/services/filter/smartFilter.test.ts`
- [x] T019 [P] [US1] Unit tests for `useSmartFilter` hook in `tests/unit/hooks/useSmartFilter.test.ts`
- [x] T020 [P] [US1] Component tests for `FilterInput` in `tests/components/FilterInput.test.tsx`
- [ ] T021 [US1] Integration test for full filter cycle in `tests/integration/filter-flow.test.tsx`

### Implementation for User Story 1

- [x] T022 [P] [US1] Implement `GeminiProvider` in `src/services/ai/gemini.ts`
- [ ] T023 [P] [US1] Implement `AnthropicProvider` in `src/services/ai/anthropic.ts` (Optional/Parallel)
- [ ] T024 [P] [US1] Implement `OpenAiProvider` in `src/services/ai/openai.ts` (Optional/Parallel)
- [x] T025 [US1] Implement `runSmartFilter()` in `src/services/filter/smartFilter.ts`
- [x] T026 [US1] Implement `useSmartFilter` hook in `src/hooks/useSmartFilter.ts`
- [x] T027 [US1] Create `FilterInput` component in `src/components/Shared/FilterInput.tsx`
- [ ] T028 [US1] Update `EmailList` component to display filter status count
- [ ] T029 [US1] Integrate filter into `src/app.tsx` with shortcut (e.g., `f`)

**Checkpoint**: User Story 1 fully functional

---

## Phase 4: User Story 2 — Clear Smart Filter and Return to Full Inbox (Priority: P1)

**Goal**: User presses Escape to clear active filter and restores full list immediately.

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

- [ ] T030 [P] [US2] Unit tests for cancellation and reset in `tests/unit/hooks/useSmartFilter.clear.test.ts`

### Implementation for User Story 2

- [ ] T031 [US2] Implement evaluation cancellation using `AbortSignal` in `useSmartFilter`
- [ ] T032 [US2] Wire `Escape` key to clear filter in `src/app.tsx`

**Checkpoint**: User Story 2 complete

---

## Phase 5: User Story 3 — View Filter Match Confidence (Priority: P2)

**Goal**: Results show confidence indicator (high/medium/low) and are sorted accordingly.

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

- [ ] T033 [P] [US3] Unit tests for confidence rendering in `tests/components/EmailList.confidence.test.tsx`

### Implementation for User Story 3

- [ ] T034 [P] [US3] Update `InboxList` to render colored confidence indicators
- [ ] T035 [US3] Ensure `runSmartFilter` returns results sorted by confidence

**Checkpoint**: User Story 3 complete

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T036 Handle progressive batch display in `src/app.tsx`
- [ ] T037 Add unit tests for vague description edge cases
- [ ] T038 Update `README.md` with AI configuration guide

---

## Implementation Strategy

### MVP First
1. Setup & Foundation
2. US1 with Gemini only
3. Test end-to-end filter flow

### Incremental Delivery
1. Add US2 (Clear/Cancel)
2. Add US3 (Confidence)
3. Add Anthropic/OpenAI providers
