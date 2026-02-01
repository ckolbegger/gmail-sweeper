# Tasks: Smart Inbox Organizer

**Input**: Design documents from `/specs/001-smart-inbox-organizer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Node.js + TypeScript project in repository root (package.json, tsconfig.json)
- [ ] T002 [P] Add linting/formatting config (eslint/prettier) in repo root
- [ ] T003 Add Vitest config for unit/integration/contract tests in repo root
- [ ] T004 Create base folder structure per plan in `src/` and `tests/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T005 Setup configuration loader in `src/core/config.ts`
- [ ] T006 [P] Implement logging utility in `src/core/logger.ts`
- [ ] T007 [P] Implement error types and error mapping in `src/core/errors.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Browse and filter inbox (Priority: P1) 🎯 MVP

**Goal**: Show inbox list sorted by date and enable filters for sender/date/label/category

**Independent Test**: Connect inbox, load list, apply filters, verify results and unread highlighting

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

- [ ] T008 [P] [US1] Contract test for list emails in `tests/contract/emails_list.test.ts`
- [ ] T009 [P] [US1] Integration test for filter workflow in `tests/integration/filter_workflow.test.ts`

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create Email entity in `src/core/entities.ts`
- [ ] T011 [P] [US1] Create Gmail adapter client in `src/adapters/gmail/client.ts`
- [ ] T012 [P] [US1] Implement email list service in `src/services/email_list_service.ts`
- [ ] T013 [P] [US1] Implement filter builder in `src/services/filter_service.ts`
- [ ] T014 [US1] Implement Gmail list adapter call in `src/adapters/gmail/list_emails.ts`
- [ ] T015 [US1] Implement TUI inbox list view in `src/tui/inbox_list.ts`
- [ ] T016 [US1] Wire filters to list view in `src/tui/inbox_filters.ts`
- [ ] T017 [US1] Add unread emphasis rendering in `src/tui/inbox_list.ts`

**Checkpoint**: User Story 1 functional and testable independently

---

## Phase 4: User Story 2 - Natural-language email search (Priority: P2)

**Goal**: Allow natural-language queries to filter email list

**Independent Test**: Submit a natural-language query and verify list updates and empty state

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

- [ ] T018 [P] [US2] Contract test for query endpoint in `tests/contract/query_emails.test.ts`
- [ ] T019 [P] [US2] Integration test for NL query workflow in `tests/integration/nl_query_workflow.test.ts`

### Implementation for User Story 2

- [ ] T020 [P] [US2] Implement NL query parser in `src/services/nl_query_service.ts`
- [ ] T021 [US2] Connect NL query to Gmail list in `src/services/email_list_service.ts`
- [ ] T022 [US2] Implement empty-state view in `src/tui/empty_state.ts`
- [ ] T023 [US2] Wire NL query input in `src/tui/nl_query_input.ts`

**Checkpoint**: User Story 2 functional and testable independently

---

## Phase 5: User Story 3 - Review and act on emails (Priority: P3)

**Goal**: Preview email contents and apply labels/archive/delete with confirmation

**Independent Test**: Select emails, preview content, confirm actions and verify Gmail updates

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

- [ ] T024 [P] [US3] Contract test for email detail in `tests/contract/email_detail.test.ts`
- [ ] T025 [P] [US3] Contract tests for actions in `tests/contract/email_actions.test.ts`
- [ ] T026 [P] [US3] Integration test for action confirmation flow in `tests/integration/action_flow.test.ts`

### Implementation for User Story 3

- [ ] T027 [P] [US3] Implement email detail fetch in `src/adapters/gmail/get_email.ts`
- [ ] T028 [P] [US3] Implement action service in `src/services/email_action_service.ts`
- [ ] T029 [US3] Implement confirmation prompt in `src/tui/confirm_prompt.ts`
- [ ] T030 [US3] Implement email preview panel in `src/tui/email_preview.ts`
- [ ] T031 [US3] Wire bulk selection in `src/tui/selection_controls.ts`

**Checkpoint**: User Story 3 functional and testable independently

---

## Phase 6: User Story 4 - Save and rerun query workflows (Priority: P4)

**Goal**: Save queries with optional action, order them, and rerun on session start with confirmation

**Independent Test**: Save a query, reopen session, rerun against new emails, confirm action

### Tests for User Story 4 (MANDATORY - Strict TDD) ⚠️

- [ ] T032 [P] [US4] Contract test for saved queries CRUD in `tests/contract/saved_queries.test.ts`
- [ ] T033 [P] [US4] Integration test for rerun workflow in `tests/integration/rerun_workflow.test.ts`

### Implementation for User Story 4

- [ ] T034 [P] [US4] Create storage adapter skeleton in `src/adapters/storage/sqlite.ts`
- [ ] T035 [P] [US4] Add SavedQuery and UserSession entities in `src/core/entities.ts`
- [ ] T036 [P] [US4] Implement data access layer for saved queries in `src/adapters/storage/saved_queries_repo.ts`
- [ ] T037 [P] [US4] Implement data access layer for sessions in `src/adapters/storage/sessions_repo.ts`
- [ ] T038 [P] [US4] Implement saved query service in `src/services/saved_query_service.ts`
- [ ] T039 [P] [US4] Implement workflow runner in `src/services/workflow_runner.ts`
- [ ] T040 [US4] Implement saved query UI in `src/tui/saved_queries_panel.ts`
- [ ] T041 [US4] Implement reorder controls in `src/tui/query_order_controls.ts`
- [ ] T042 [US4] Implement session start prompt in `src/tui/session_prompt.ts`

**Checkpoint**: User Story 4 functional and testable independently

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T043 [P] Add docs updates in `docs/`
- [ ] T044 [P] Add performance optimizations in `src/services/`
- [ ] T045 [P] Add additional unit tests in `tests/unit/`
- [ ] T046 [P] Add security hardening checks in `src/core/`
- [ ] T047 Run quickstart validation steps in `specs/001-smart-inbox-organizer/quickstart.md`


---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - independent
- **User Story 3 (P3)**: Can start after Foundational - independent
- **User Story 4 (P4)**: Can start after Foundational - independent

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Foundational tasks marked [P] can run in parallel
- Tests within each user story can run in parallel
- Independent TUI components per story can run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "Contract test for list emails in tests/contract/emails_list.test.ts"
Task: "Integration test for filter workflow in tests/integration/filter_workflow.test.ts"
Task: "Implement email list service in src/services/email_list_service.ts"
Task: "Implement filter builder in src/services/filter_service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate User Story 1 independently

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently → Deliver MVP
3. User Story 2 → Test independently → Deliver
4. User Story 3 → Test independently → Deliver
5. User Story 4 → Test independently → Deliver
