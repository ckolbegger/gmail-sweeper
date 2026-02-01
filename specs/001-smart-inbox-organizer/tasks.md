# Tasks: Smart Inbox Organizer

**Input**: Design documents from `/specs/001-smart-inbox-organizer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan (src/core/, src/cli/, tests/)
- [ ] T002 Initialize TypeScript project with Node.js 20+ and dependencies (googleapis, ink, better-sqlite3, ollama, zod)
- [ ] T003 [P] Configure TypeScript compiler options in tsconfig.json
- [ ] T004 [P] Configure linting (ESLint) and formatting (Prettier) tools
- [ ] T005 [P] Setup Vitest testing framework with tsx for TypeScript execution
- [ ] T006 Create .env.example with OAuth2 configuration placeholders

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Persistence

- [ ] T007 [P] Create SQLite database schema in src/core/persistence/migrations/001_initial.sql
- [ ] T008 [P] Implement database connection and migration runner in src/core/persistence/database.ts
- [ ] T009 [P] Create Zod validation schemas in src/core/models/validation.ts

### Core Models

- [ ] T010 [P] Create Email model types and validation in src/core/models/email.ts
- [ ] T011 [P] Create Query model types and validation in src/core/models/query.ts
- [ ] T012 [P] Create Workflow model types and validation in src/core/models/workflow.ts
- [ ] T013 [P] Create Session model types and validation in src/core/models/session.ts
- [ ] T014 [P] Create Label model types and validation in src/core/models/label.ts
- [ ] T015 Create models barrel export in src/core/models/index.ts

### Shared Contracts

- [ ] T016 [P] Create shared type definitions in src/core/contracts/types.ts
- [ ] T017 [P] Create Gmail API contract interfaces in src/core/contracts/gmail-api.ts
- [ ] T018 [P] Create NL Query contract interfaces in src/core/contracts/nl-query.ts
- [ ] T019 [P] Create Workflow contract interfaces in src/core/contracts/workflow.ts
- [ ] T020 Create contracts barrel export in src/core/contracts/index.ts

### Error Handling & Logging

- [ ] T021 [P] Implement custom error classes in src/core/errors/index.ts
- [ ] T022 [P] Implement logging infrastructure in src/core/logging/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Browse and Filter Inbox (Priority: P1) 🎯 MVP

**Goal**: View Gmail inbox with sorting and filtering capabilities to quickly find relevant emails

**Independent Test**: Connect to Gmail, display emails in list view, verify sorting by date (descending), sender, label, and category works correctly

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T023 [P] [US1] Unit test for EmailRepository in tests/unit/core/email-repository.test.ts
- [ ] T024 [P] [US1] Contract test for GmailClient in tests/contract/gmail-client.test.ts
- [ ] T025 [P] [US1] Integration test for email listing flow in tests/integration/email-list.test.ts
- [ ] T026 [P] [US1] Unit test for email sorting and filtering logic in tests/unit/core/email-sort-filter.test.ts

### Implementation for User Story 1

#### Data Layer

- [ ] T027 [US1] Implement EmailRepository for CRUD operations in src/core/services/email-repository.ts
- [ ] T028 [US1] Implement LabelRepository for label caching in src/core/services/label-repository.ts

#### Gmail API Service

- [ ] T029 [US1] Implement AuthManager for OAuth2 flow in src/core/services/auth-manager.ts
- [ ] T030 [US1] Implement GmailClient for email fetching in src/core/services/gmail-client.ts
- [ ] T031 [US1] Implement email sync operations (full and incremental) in src/core/services/gmail-client.ts

#### Core Services

- [ ] T032 [US1] Implement email sorting service in src/core/services/email-sorter.ts
- [ ] T033 [US1] Implement email filtering service in src/core/services/email-filter.ts

#### CLI Components

- [ ] T034 [P] [US1] Create EmailList TUI component in src/cli/components/email-list.tsx
- [ ] T035 [P] [US1] Create EmailDetail TUI component in src/cli/components/email-detail.tsx
- [ ] T036 [US1] Create keyboard navigation hook in src/cli/hooks/use-keyboard.ts
- [ ] T037 [US1] Implement main CLI app structure in src/cli/app.tsx
- [ ] T038 [US1] Create CLI entry point in src/cli/index.ts

#### Integration

- [ ] T039 [US1] Wire up email list display with Gmail sync in src/cli/app.tsx
- [ ] T040 [US1] Implement sort commands (date, sender, label, category) in src/cli/components/email-list.tsx
- [ ] T041 [US1] Implement filter commands in src/cli/components/email-list.tsx
- [ ] T042 [US1] Add visual distinction for unread emails (bold text) in src/cli/components/email-list.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Natural Language Email Search (Priority: P1) 🎯 MVP

**Goal**: Describe emails using natural language to find specific types of messages without complex query syntax

**Independent Test**: Enter natural language queries (e.g., "financial offers", "event promotions") and verify email list updates to show semantically matching emails

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T043 [P] [US2] Unit test for NLQueryEngine in tests/unit/core/nl-query-engine.test.ts
- [ ] T044 [P] [US2] Integration test for natural language search flow in tests/integration/nl-search.test.ts
- [ ] T045 [P] [US2] Contract test for Ollama integration in tests/contract/ollama-client.test.ts

### Implementation for User Story 2

#### Query Engine

- [ ] T046 [US2] Implement Ollama client wrapper in src/core/services/ollama-client.ts
- [ ] T047 [US2] Implement NLQueryEngine for semantic search in src/core/services/nl-query-engine.ts
- [ ] T048 [US2] Implement query result caching in src/core/services/nl-query-engine.ts
- [ ] T049 [US2] Implement query explanation feature in src/core/services/nl-query-engine.ts

#### Query Repository

- [ ] T050 [US2] Implement QueryRepository for saved queries in src/core/services/query-repository.ts

#### CLI Components

- [ ] T051 [US2] Create QueryInput TUI component in src/cli/components/query-input.tsx
- [ ] T052 [US2] Integrate NL query input with email list filtering in src/cli/app.tsx
- [ ] T053 [US2] Add query execution status display in src/cli/components/query-input.tsx

#### Integration

- [ ] T054 [US2] Wire up natural language queries to filter email list in src/cli/app.tsx
- [ ] T055 [US2] Implement email detail pane display when email selected in src/cli/components/email-detail.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Email Actions (Priority: P1) 🎯 MVP

**Goal**: Select emails and apply actions (label, archive, delete) to manage inbox efficiently

**Independent Test**: Select individual or all emails and apply labels, archive, or delete them, then verify actions are reflected in Gmail

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T056 [P] [US3] Unit test for email selection logic in tests/unit/core/email-selection.test.ts
- [ ] T057 [P] [US3] Integration test for email actions flow in tests/integration/email-actions.test.ts
- [ ] T058 [P] [US3] Contract test for Gmail batch actions in tests/contract/gmail-actions.test.ts

### Implementation for User Story 3

#### Selection Logic

- [ ] T059 [US3] Implement email selection state management in src/core/services/selection-service.ts

#### Gmail Actions

- [ ] T060 [US3] Implement label application in src/core/services/gmail-client.ts
- [ ] T061 [US3] Implement archive operation in src/core/services/gmail-client.ts
- [ ] T062 [US3] Implement delete (trash) operation in src/core/services/gmail-client.ts
- [ ] T063 [US3] Implement batch action handling with progress in src/core/services/gmail-client.ts

#### CLI Components

- [ ] T064 [US3] Add keyboard shortcuts for selection (Space, a) in src/cli/hooks/use-keyboard.ts
- [ ] T065 [US3] Add action keyboard shortcuts (l, e, d) in src/cli/hooks/use-keyboard.ts
- [ ] T066 [US3] Create action confirmation dialog in src/cli/components/action-dialog.tsx
- [ ] T067 [US3] Add visual selection indicators in src/cli/components/email-list.tsx

#### Integration

- [ ] T068 [US3] Wire up selection and actions to Gmail API in src/cli/app.tsx
- [ ] T069 [US3] Implement action confirmation for destructive operations in src/cli/app.tsx
- [ ] T070 [US3] Add action progress feedback in src/cli/components/action-dialog.tsx

**Checkpoint**: MVP Complete (User Stories 1-3) - Core inbox management workflow functional

---

## Phase 6: User Story 4 - Save Queries and Actions (Priority: P2)

**Goal**: Save natural language queries along with their associated actions for reuse

**Independent Test**: Run a natural language query, apply actions to results, save the query-action pair, and verify it appears in saved workflows

### Tests for User Story 4 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T071 [P] [US4] Unit test for WorkflowRepository in tests/unit/core/workflow-repository.test.ts
- [ ] T072 [P] [US4] Integration test for workflow creation flow in tests/integration/workflow-create.test.ts

### Implementation for User Story 4

#### Workflow Repository

- [ ] T073 [US4] Implement WorkflowRepository in src/core/services/workflow-repository.ts
- [ ] T074 [US4] Implement workflow CRUD operations in src/core/services/workflow-repository.ts

#### Workflow Engine

- [ ] T075 [US4] Implement workflow creation from current query in src/core/services/workflow-engine.ts
- [ ] T076 [US4] Implement workflow action association in src/core/services/workflow-engine.ts

#### CLI Components

- [ ] T077 [US4] Create WorkflowList TUI component in src/cli/components/workflow-list.tsx
- [ ] T078 [US4] Create workflow save dialog in src/cli/components/workflow-save-dialog.tsx
- [ ] T079 [US4] Add workflow keyboard shortcuts (w, W) in src/cli/hooks/use-keyboard.ts

#### Integration

- [ ] T080 [US4] Wire up workflow save functionality in src/cli/app.tsx
- [ ] T081 [US4] Implement workflow list view in src/cli/app.tsx
- [ ] T082 [US4] Add workflow editing capability in src/cli/components/workflow-list.tsx

**Checkpoint**: User Story 4 complete - Workflows can be saved and managed

---

## Phase 7: User Story 5 - Automated Session Workflows (Priority: P2)

**Goal**: Saved queries automatically run against new emails when opening a session

**Independent Test**: Save queries, close session, receive new emails, reopen app, and verify user is prompted to run saved queries against emails received since last session

### Tests for User Story 5 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T083 [P] [US5] Unit test for SessionService in tests/unit/core/session-service.test.ts
- [ ] T084 [P] [US5] Integration test for session workflow automation in tests/integration/session-workflows.test.ts
- [ ] T085 [P] [US5] Unit test for workflow execution engine in tests/unit/core/workflow-execution.test.ts

### Implementation for User Story 5

#### Session Management

- [ ] T086 [US5] Implement SessionRepository in src/core/services/session-repository.ts
- [ ] T087 [US5] Implement SessionService for tracking in src/core/services/session-service.ts
- [ ] T088 [US5] Implement last session timestamp tracking in src/core/services/session-service.ts

#### Workflow Execution

- [ ] T089 [US5] Implement workflow execution engine in src/core/services/workflow-engine.ts
- [ ] T090 [US5] Implement workflow ordering and sequencing in src/core/services/workflow-engine.ts
- [ ] T091 [US5] Implement ExecutionRepository for logging in src/core/services/execution-repository.ts
- [ ] T092 [US5] Implement conflict resolution for multiple workflows in src/core/services/workflow-engine.ts

#### New Email Detection

- [ ] T093 [US5] Implement new email detection since last session in src/core/services/gmail-client.ts
- [ ] T094 [US5] Implement workflow prompt logic for new emails in src/core/services/workflow-engine.ts

#### CLI Components

- [ ] T095 [US5] Create session startup workflow prompt in src/cli/components/session-prompt.tsx
- [ ] T096 [US5] Create workflow execution progress view in src/cli/components/workflow-progress.tsx

#### Integration

- [ ] T097 [US5] Wire up session startup workflow detection in src/cli/app.tsx
- [ ] T098 [US5] Implement workflow confirmation before apply in src/cli/app.tsx
- [ ] T099 [US5] Add workflow execution progress display in src/cli/app.tsx

**Checkpoint**: All user stories complete - Full automation workflow functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Build & Distribution

- [ ] T100 [P] Create build script for binary compilation in scripts/build-binary.ts
- [ ] T101 [P] Configure pkg or deno compile for single executable output
- [ ] T102 [P] Add CI/CD workflow for automated builds in .github/workflows/build.yml

### Documentation

- [ ] T103 [P] Update README.md with installation and usage instructions
- [ ] T104 [P] Create architecture documentation in docs/architecture.md
- [ ] T105 [P] Add JSDoc comments to all public APIs

### Testing & Quality

- [ ] T106 [P] Add unit tests for all services in tests/unit/core/
- [ ] T107 [P] Add CLI component tests in tests/unit/cli/
- [ ] T108 [P] Add end-to-end test suite in tests/e2e/
- [ ] T109 [P] Achieve >80% code coverage

### Performance & Optimization

- [ ] T110 [P] Implement email list virtualization for large inboxes in src/cli/components/email-list.tsx
- [ ] T111 [P] Add database query optimization and indexing verification
- [ ] T112 [P] Implement request batching for Gmail API in src/core/services/gmail-client.ts

### Error Handling & Reliability

- [ ] T113 [P] Add comprehensive error boundaries in CLI components
- [ ] T114 [P] Implement retry logic for Gmail API failures in src/core/services/gmail-client.ts
- [ ] T115 [P] Add graceful degradation when Ollama is unavailable in src/core/services/nl-query-engine.ts

### Security

- [ ] T116 [P] Audit OAuth2 token storage security
- [ ] T117 [P] Add input sanitization for all user inputs
- [ ] T118 [P] Implement secure credential storage verification

### Quickstart Validation

- [ ] T119 Run through quickstart.md validation - ensure all commands work
- [ ] T120 Test binary distribution on clean machine

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
  - MVP = US1 + US2 + US3 (all P1)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Uses EmailRepository from US1
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Uses GmailClient from US1
- **User Story 4 (P2)**: Can start after US2 (needs Query) and US3 (needs Actions) - Builds on both
- **User Story 5 (P2)**: Can start after US4 (needs Workflows) - Builds on workflow system

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before CLI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes:
  - US1, US2, US3 can start in parallel (they're independent P1 stories)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (MANDATORY):
Task: "Unit test for EmailRepository in tests/unit/core/email-repository.test.ts"
Task: "Contract test for GmailClient in tests/contract/gmail-client.test.ts"
Task: "Integration test for email listing flow in tests/integration/email-list.test.ts"
Task: "Unit test for email sorting and filtering logic in tests/unit/core/email-sort-filter.test.ts"

# Launch all models/repositories for User Story 1 together:
Task: "Implement EmailRepository for CRUD operations in src/core/services/email-repository.ts"
Task: "Implement LabelRepository for label caching in src/core/services/label-repository.ts"

# Launch all CLI components for User Story 1 together:
Task: "Create EmailList TUI component in src/cli/components/email-list.tsx"
Task: "Create EmailDetail TUI component in src/cli/components/email-detail.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Browse and Filter)
4. Complete Phase 4: User Story 2 (Natural Language Search)
5. Complete Phase 5: User Story 3 (Email Actions)
6. **STOP and VALIDATE**: Test complete MVP workflow
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Basic inbox viewer!)
3. Add User Story 2 → Test independently → Deploy/Demo (Now with NL search!)
4. Add User Story 3 → Test independently → Deploy/Demo (MVP complete!)
5. Add User Story 4 → Test independently → Deploy/Demo (Workflows!)
6. Add User Story 5 → Test independently → Deploy/Demo (Full automation!)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Browse/Filter)
   - Developer B: User Story 2 (NL Search)
   - Developer C: User Story 3 (Actions)
3. Stories complete and integrate independently
4. Then team converges on US4/US5 which depend on earlier stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- TDD is mandatory: Tests must be written first and fail before implementation
