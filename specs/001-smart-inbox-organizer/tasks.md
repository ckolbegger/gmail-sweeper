---
description: "Task list template for feature implementation"
---

# Tasks: Smart Inbox Organizer

**Input**: Design documents from `specs/001-smart-inbox-organizer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation. Enforce 100% integration test coverage for all user stories.

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

- [x] T001 Create project structure (`src/`, `tests/`, `specs/`) per implementation plan
- [x] T002 Initialize Node.js project with TypeScript, `ink`, `react`, `vitest` dependencies
- [x] T003 [P] Configure linting (ESLint) and formatting (Prettier) tools
- [x] T004 [P] Setup `.env` and `credentials.json` handling (gitignores)
- [x] T005 [P] Setup `vitest` configuration and `ink-testing-library` helpers

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Define shared domain type `Email` in `src/types/index.ts` (Defer `Workflow` to US4)
- [x] T007 Define `IEmailService` (Read-Only methods) in `src/types/interfaces.ts` (Defer mutation methods to US3)
- [x] T008 Implement Mock `EmailService` (Read-Only) for testing in `tests/mocks/mockEmailService.ts`
- [x] T010 Setup main `App` component shell in `src/app.tsx`
- [x] T011 Implement `GmailService` skeleton (auth flow) using `google-auth-library` in `src/services/gmail/gmailService.ts`
  - Tests:
    - it should instantiate with valid credentials
    - it should initiate OAuth2 flow if no token exists
    - it should refresh token if expired
    - it should throw meaningful error if credentials.json is missing

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Navigate Inbox (Priority: P1) 🎯 MVP

**Goal**: Users can view inbox emails, sort them, and preview content.

**Independent Test**: Launch app -> Inbox loads -> Unread bold -> Preview panel works.

### Implementation for User Story 1 (Strict TDD)

- [ ] T015 [P] [US1] Implement `listEmails` in `src/services/gmail/gmailService.ts` (using Mock/Real switch)
  - Tests:
    - it should fetch emails with pagination tokens
    - it should respect maxResults parameter (boundary: 1 to 500)
    - it should sort emails by internalDate
    - it should map Gmail API response to Email domain model
    - it should handle API errors gracefully (401, 403, 429, 500)
    - it should correctly construct the query string (e.g., "label:INBOX")
    - it should return empty list if API returns no messages (boundary)
    - it should handle invalid/expired page tokens gracefully

- [ ] T016 [P] [US1] Create `InboxList` component in `src/components/Inbox/InboxList.tsx`
  - Tests:
    - it should render a list of emails
    - it should distinguish unread emails (bold/color)
    - it should handle selection (enter/click)
    - it should visually indicate the currently focused item
    - it should display empty state when list is empty
    - it should support keyboard navigation (up/down arrows)
    - it should not scroll past top or bottom boundary (boundary)

- [ ] T017 [P] [US1] Create `EmailDetail` component in `src/components/Inbox/EmailDetail.tsx`
  - Tests:
    - it should render email subject, from, and date headers
    - it should render the email body content
    - it should sanitize HTML content for display (or plain text fallback)
    - it should handle "no email selected" state
    - it should handle scrolling for long content

- [ ] T018 [US1] Implement `useGmail` hook for data fetching in `src/hooks/useGmail.ts`
  - Tests:
    - it should fetch data on mount
    - it should manage loading and error states
    - it should expose refresh/refetch capability

- [ ] T019 [US1] Integrate List and Detail into `src/app.tsx` with navigation state
  - Tests:
    - it should switch focus between list and detail panes
    - it should update detail view when list item changes

- [ ] T020 [US1] Add CLI flag parsing for page size override (`--limit`)

### Integration Tests for User Story 1

- [ ] T046 [US1] Integration test for Inbox Flow in `tests/integration/inbox-flow.test.ts`
  - Tests:
    - it should load initial inbox using Mock Service
    - it should navigate through the list
    - it should display details for the selected email
    - it should handle pagination (load more) [if applicable]

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Natural Language Filtering (Priority: P2)

**Goal**: Users can filter emails using natural language (Gemini 3 Flash).

**Independent Test**: Type "finance" -> List updates to show finance emails only.

### Implementation for User Story 2 (Strict TDD)

- [ ] T009 [US2] Define `IAIService` interface and implement Mock `AIService` in `tests/mocks/mockAIService.ts` (Moved from Foundation)

- [ ] T023 [P] [US2] Implement `GeminiService` in `src/services/ai/geminiService.ts` (using `@google/generative-ai`)
  - Tests:
    - it should generate a valid Gmail search query from natural language input
    - it should handle API authentication errors
    - it should handle empty or ambiguous inputs
    - it should parse the AI response correctly (extracting query string)
    - it should fallback/error gracefully if AI is unavailable
    - it should handle rate limit (429) responses with appropriate error message

- [ ] T024 [P] [US2] Create `FilterInput` component in `src/components/Shared/FilterInput.tsx`
  - Tests:
    - it should render an input field
    - it should capture text input
    - it should trigger `onSubmit` with the entered term
    - it should display a loading indicator during processing
    - it should support "clear" or "reset" functionality

- [ ] T025 [US2] Update `useGmail` hook to support `query` parameter
  - Tests:
    - it should refetch emails when query changes
    - it should reset pagination when query changes

- [ ] T026 [US2] Integrate FilterInput into `src/app.tsx` (triggering re-fetch with query)

### Integration Tests for User Story 2

- [ ] T047 [US2] Integration test for Filter Flow in `tests/integration/filter-flow.test.ts`
  - Tests:
    - it should update email list based on filter input
    - it should handle "no results" scenario integration
    - it should interactions between Filter Input and Inbox List

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - Saved Workflows (Priority: P2)

**Goal**: Users can save and re-run successful queries.

**Independent Test**: Save query -> Restart -> Load query -> Results match.

### Implementation for User Story 4 (Strict TDD)

- [ ] T044 [US4] Define `Workflow` domain type in `src/types/index.ts` (Moved from Foundation)

- [ ] T029 [P] [US4] Implement `FileWorkflowService` using `conf` in `src/services/workflow/workflowService.ts`
  - Tests:
    - it should save a valid workflow object
    - it should retrieve all saved workflows
    - it should delete a workflow by ID
    - it should persist data across instances (mock fs/conf)
    - it should validate unique names (if required)
    - it should handle corrupt or invalid JSON config file gracefully
    - it should handle filesystem permission errors

- [ ] T030 [P] [US4] Create `WorkflowList` component in `src/components/Workflows/WorkflowList.tsx`
  - Tests:
    - it should list available workflows
    - it should handle selection of a workflow
    - it should provide visual indication of the "active" workflow
    - it should handle empty list state

- [ ] T031 [US4] Add "Save Workflow" action to `src/app.tsx`

- [ ] T032 [US4] Implement startup prompt for saved workflows

### Integration Tests for User Story 4

- [ ] T048 [US4] Integration test for Workflow Persistence in `tests/integration/workflow-flow.test.ts`
  - Tests:
    - it should save a current filter as a workflow
    - it should see the new workflow in the list
    - it should apply the workflow filter when selected

**Checkpoint**: User Story 4 complete (Note: US4 prioritized before US3 based on P2 vs P3)

---

## Phase 6: User Story 3 - Organize Actions (Priority: P3)

**Goal**: Users can Archive, Delete, or Label emails with confirmation.

**Independent Test**: Select email -> Archive -> Confirm -> Email removed from list.

### Implementation for User Story 3 (Strict TDD)

- [ ] T045 [US3] Update `IEmailService` and `MockEmailService` with mutation methods (archive/delete/label)

- [ ] T035 [P] [US3] Implement `ActionService` in `src/services/actions/actionService.ts`
  - Tests:
    - it should call appropriate API method for "archive"
    - it should call appropriate API method for "delete"
    - it should call appropriate API method for "label"
    - it should guard against acting on null/undefined IDs
    - it should propagate specific API errors (403 Forbidden, 404 Not Found)
    - it should handle partial success if supported (or fail all)

- [ ] T036 [P] [US3] Create `ConfirmationDialog` component in `src/components/Shared/ConfirmationDialog.tsx`
  - Tests:
    - it should render the confirmation message
    - it should trigger "confirm" callback on Yes/Enter
    - it should trigger "cancel" callback on No/Esc
    - it should not be visible when `isOpen` is false

- [ ] T037 [US3] Add action shortcuts (a/d/l) to `src/app.tsx` or `InboxList`

- [ ] T038 [US3] Wire up actions to `GmailService` (archive/delete/label methods)

### Integration Tests for User Story 3

- [ ] T049 [US3] Integration test for Action Flow in `tests/integration/action-flow.test.ts`
  - Tests:
    - it should complete the Archive flow: Select -> Archive -> Confirm -> List Update
    - it should complete the Delete flow: Select -> Delete -> Confirm -> List Update
    - it should cancel an action without side effects

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