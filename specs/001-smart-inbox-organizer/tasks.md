---
description: "Task list template for feature implementation"
---

# Tasks: Smart Inbox Organizer

**Input**: Design documents from `specs/001-smart-inbox-organizer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Services**: `src/services/`
- **Components**: `src/components/`
- **Hooks**: `src/hooks/`
- **Contracts/Types**: `src/types/` (from contracts/)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure (`src/`, `tests/`, `specs/`) per implementation plan
- [ ] T002 Initialize Node.js project with TypeScript, `ink`, `react`, `vitest` dependencies
- [ ] T003 [P] Configure linting (ESLint) and formatting (Prettier) tools
- [ ] T004 [P] Setup `.env` and `credentials.json` handling (gitignores)
- [ ] T005 [P] Setup `vitest` configuration and `ink-testing-library` helpers

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Define shared domain types (Email, Workflow) in `src/types/index.ts` from data-model.md
- [ ] T007 Define Service Interfaces (IEmailService, IAIService) in `src/types/interfaces.ts` from contracts/
- [ ] T008 Implement Mock `EmailService` for testing in `tests/mocks/mockEmailService.ts`
- [ ] T009 Implement Mock `AIService` for testing in `tests/mocks/mockAIService.ts`
- [ ] T010 Setup main `App` component shell in `src/app.tsx`
- [ ] T011 Implement `GmailService` skeleton (auth flow) using `google-auth-library` in `src/services/gmail/gmailService.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Navigate Inbox (Priority: P1) 🎯 MVP

**Goal**: Users can view inbox emails, sort them, and preview content.

**Independent Test**: Launch app -> Inbox loads -> Unread bold -> Preview panel works.

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] Unit test for `GmailService.listEmails` (pagination, sorting) in `tests/unit/gmailService.test.ts`
- [ ] T013 [P] [US1] Component test for `InboxList` (rendering, selection) in `tests/components/InboxList.test.tsx`
- [ ] T014 [P] [US1] Component test for `EmailDetail` (rendering body) in `tests/components/EmailDetail.test.tsx`

### Implementation for User Story 1

- [ ] T015 [P] [US1] Implement `listEmails` in `src/services/gmail/gmailService.ts` (using Mock/Real switch)
- [ ] T016 [P] [US1] Create `InboxList` component in `src/components/Inbox/InboxList.tsx`
- [ ] T017 [P] [US1] Create `EmailDetail` component in `src/components/Inbox/EmailDetail.tsx`
- [ ] T018 [US1] Implement `useGmail` hook for data fetching in `src/hooks/useGmail.ts`
- [ ] T019 [US1] Integrate List and Detail into `src/app.tsx` with navigation state
- [ ] T020 [US1] Add CLI flag parsing for page size override (`--limit`)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Natural Language Filtering (Priority: P2)

**Goal**: Users can filter emails using natural language (Gemini 3 Flash).

**Independent Test**: Type "finance" -> List updates to show finance emails only.

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

- [ ] T021 [P] [US2] Unit test for `AIService.generateFilter` (prompt generation, parsing) in `tests/unit/aiService.test.ts`
- [ ] T022 [P] [US2] Component test for `FilterInput` (input handling) in `tests/components/FilterInput.test.tsx`

### Implementation for User Story 2

- [ ] T023 [P] [US2] Implement `GeminiService` in `src/services/ai/geminiService.ts` (using `@google/generative-ai`)
- [ ] T024 [P] [US2] Create `FilterInput` component in `src/components/Shared/FilterInput.tsx`
- [ ] T025 [US2] Update `useGmail` hook to support `query` parameter
- [ ] T026 [US2] Integrate FilterInput into `src/app.tsx` (triggering re-fetch with query)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - Saved Workflows (Priority: P2)

**Goal**: Users can save and re-run successful queries.

**Independent Test**: Save query -> Restart -> Load query -> Results match.

### Tests for User Story 4 (MANDATORY - Strict TDD) ⚠️

- [ ] T027 [P] [US4] Unit test for `WorkflowService` (save, load, persist) in `tests/unit/workflowService.test.ts`
- [ ] T028 [P] [US4] Component test for `WorkflowList` (display, selection) in `tests/components/WorkflowList.test.tsx`

### Implementation for User Story 4

- [ ] T029 [P] [US4] Implement `FileWorkflowService` using `conf` in `src/services/workflow/workflowService.ts`
- [ ] T030 [P] [US4] Create `WorkflowList` component in `src/components/Workflows/WorkflowList.tsx`
- [ ] T031 [US4] Add "Save Workflow" action to `src/app.tsx`
- [ ] T032 [US4] Implement startup prompt for saved workflows

**Checkpoint**: User Story 4 complete (Note: US4 prioritized before US3 based on P2 vs P3)

---

## Phase 6: User Story 3 - Organize Actions (Priority: P3)

**Goal**: Users can Archive, Delete, or Label emails with confirmation.

**Independent Test**: Select email -> Archive -> Confirm -> Email removed from list.

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

- [ ] T033 [P] [US3] Unit test for `ActionService` (safety checks, API calls) in `tests/unit/actionService.test.ts`
- [ ] T034 [P] [US3] Component test for `ConfirmationDialog` in `tests/components/ConfirmationDialog.test.tsx`

### Implementation for User Story 3

- [ ] T035 [P] [US3] Implement `ActionService` in `src/services/actions/actionService.ts`
- [ ] T036 [P] [US3] Create `ConfirmationDialog` component in `src/components/Shared/ConfirmationDialog.tsx`
- [ ] T037 [US3] Add action shortcuts (a/d/l) to `src/app.tsx` or `InboxList`
- [ ] T038 [US3] Wire up actions to `GmailService` (archive/delete/label methods)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T039 [P] Add error handling boundary (network failures, API limits)
- [ ] T040 Refactor generic list components for reuse
- [ ] T041 Performance tuning (memoize list items)
- [ ] T042 Update `README.md` and `quickstart.md` with final instructions
- [ ] T043 Run full integration test suite

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Blocks all user stories
- **US1 (Phase 3)**: Blocks nothing, but foundational for UX
- **US2 (Phase 4)**: Independent, but enhances US1
- **US4 (Phase 5)**: Depends on US2 (needs queries to save)
- **US3 (Phase 6)**: Independent logic, integrates into US1 UI

### User Story Dependencies

- **US1 (P1)**: Independent
- **US2 (P2)**: Independent logic, UI integrates into App
- **US4 (P2)**: Depends on US2 logic (FilterQuery)
- **US3 (P3)**: Independent logic, UI integrates into App

### Parallel Opportunities

- **T012, T013, T014** (US1 Tests) can run in parallel
- **T015, T016, T017** (US1 Impl) can run in parallel
- **US2 and US3** can technically be developed in parallel by separate devs

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2 (Setup & Foundation)
2. Complete Phase 3 (US1 - View Inbox)
3. **STOP and VALIDATE**: Ensure basic reading capability works perfectly.

### Incremental Delivery

1. Add US2 (Filtering) -> "Smart" Reader
2. Add US4 (Workflows) -> "Automated" Reader
3. Add US3 (Actions) -> Full "Organizer"

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
