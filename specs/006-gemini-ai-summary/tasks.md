---
description: "Task list template for feature implementation"
---

# Tasks: AI Summary

**Input**: Design documents from `/specs/006-gemini-ai-summary/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup & Foundational

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T001 Define `EmailSummary`, `SummarizeEmailRequest`, `SummarizeEmailResponse`, `IAiProviderExtensions`, and `ISummaryStorage` interfaces in `src/types/interfaces.ts` or `src/services/ai/provider.ts` and `src/services/storage/summaryStore.ts` types.
- [x] T002 Implement `SummaryStorage` service with local JSON persistence (`~/.config/gmail-sweep/summaries.json`) in `src/services/storage/summaryStore.ts` (write unit tests in `tests/unit/summaryStore.test.ts` first).
- [x] T003 Update existing `AiProvider` configurations/factories in `src/services/ai/config.ts` and `src/services/ai/provider.ts` to support the new `IAiProviderExtensions`.
- [x] T004 Implement `summarizeEmail` method for `GeminiProvider` in `src/services/ai/gemini.ts` (write unit tests in `tests/unit/services/ai/provider.test.ts` first).
- [x] T005 [P] Implement `summarizeEmail` method for `OpenAiProvider` in `src/services/ai/openai.ts`.
- [x] T006 [P] Implement `summarizeEmail` method for `AnthropicProvider` in `src/services/ai/anthropic.ts`.

**Checkpoint**: Foundation ready - AI providers can summarize, and the storage service can persist summaries.

---

## Phase 2: User Story 1 - Generate AI Summary (Priority: P1) 🎯 MVP

**Goal**: As a user viewing an email in the detail view, I want to press the 's' key to instantly generate and view an AI summary of the email's content and action items.

**Independent Test**: Can be fully tested by selecting an unsummarized email, pressing 's', verifying a summary is generated and displayed in the correct format, and verifying the LLM was called.

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

- [ ] T007 [US1] Integration test for generating a new summary from the detail view in `tests/integration/summary-flow.test.tsx`. (Ensure it fails).

### Implementation for User Story 1

- [ ] T008 [US1] Create a `useSummary` hook in `src/hooks/useSummary.ts` to manage summary loading state, handle LLM invocation, and return the current summary (write unit tests in `tests/unit/useSummary.test.ts` first).
- [ ] T009 [US1] Update `src/app.tsx` to pass the `AiProvider` and `SummaryStorage` instances to `EmailDetail`.
- [ ] T010 [US1] Modify `src/components/Inbox/EmailDetail.tsx` to accept the new services, use the `useSummary` hook, and intercept the 's' key using Ink's `useInput`.
- [ ] T011 [US1] Update `EmailDetail.tsx` to display a loading indicator when `isSummarizing` is true, and handle LLM error states.
- [ ] T012 [US1] Create a new `SummaryView` component (or add conditional rendering in `EmailDetail.tsx`) to display the one-sentence description and bulleted action items.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Pressing 's' generates and displays a summary.

---

## Phase 3: User Story 2 - Toggle Back to Detail View (Priority: P1)

**Goal**: As a user looking at an email's summary view, I want to press the 's' key to return to the original full email content.

**Independent Test**: Can be tested by starting in the summary view, pressing 's', and verifying the view switches back to the full email content.

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

- [ ] T013 [US2] Update integration test in `tests/integration/summary-flow.test.tsx` to assert that pressing 's' while the summary view is active returns to the full detail view. (Ensure it fails).

### Implementation for User Story 2

- [ ] T014 [US2] Update `useSummary` hook in `src/hooks/useSummary.ts` to expose a boolean `isSummaryActive` state and a `toggleSummaryView` method.
- [ ] T015 [US2] Modify the 's' key handler in `src/components/Inbox/EmailDetail.tsx` to conditionally toggle the view back to the full email body if `isSummaryActive` is true.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. You can toggle back and forth.

---

## Phase 4: User Story 3 - View Existing Summary (Priority: P2)

**Goal**: As a user viewing an email that was previously summarized, I want to press the 's' key to instantly see the summary without waiting for the LLM to generate it again.

**Independent Test**: Can be tested by viewing a previously summarized email, pressing 's', and verifying the summary view appears instantly without any new LLM network calls.

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

- [ ] T016 [US3] Update integration test in `tests/integration/summary-flow.test.tsx` to verify that requesting a summary for an already-summarized email returns the cached version instantly (0 LLM calls). (Ensure it fails).

### Implementation for User Story 3

- [ ] T017 [US3] Update the `useSummary` hook (`src/hooks/useSummary.ts`) to check `SummaryStorage.getSummary(emailId)` before invoking the AI Provider. If a cached summary exists, return it immediately and do not trigger a new LLM request.
- [ ] T018 [US3] Ensure the `useSummary` hook persists newly generated summaries by calling `SummaryStorage.saveSummary()` after a successful LLM invocation.

**Checkpoint**: All user stories should now be independently functional. Existing summaries are loaded instantly.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T019 Update `README.md` to document the new 's' keybinding for AI Summaries.
- [ ] T020 Run `npm run lint` and `npm test` to ensure no regressions were introduced across the codebase.
- [ ] T021 Manual exploratory testing using instructions in `quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup & Foundational (Phase 1)**: Must be completed first to establish the contracts and underlying services.
- **User Story 1 (Phase 2)**: Depends on Phase 1. Implements the core generation flow.
- **User Story 2 (Phase 3)**: Depends on Phase 2. Adds the ability to toggle back to the original view.
- **User Story 3 (Phase 4)**: Depends on Phase 2 and Phase 1 (Storage). Adds caching layer.

### Parallel Opportunities

- Implementing the AI providers for OpenAI (T005) and Anthropic (T006) can be done in parallel with T004, or even deferred if only Gemini is strictly required for the MVP.
- Writing unit tests for the `useSummary` hook (T008) can happen concurrently with UI updates (T009-T012) if mock services are used.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup & Foundational.
2. Complete Phase 2: User Story 1.
3. **STOP and VALIDATE**: Ensure pressing 's' generates a summary.

### Incremental Delivery

1. Deliver User Story 1: Generation works.
2. Deliver User Story 2: Toggle works (UX improved).
3. Deliver User Story 3: Caching works (Performance improved).