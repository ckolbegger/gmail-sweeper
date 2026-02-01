# Tasks: Smart Inbox Organizer

**Input**: Design documents from `/specs/001-smart-inbox-organizer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Node.js + TypeScript project in repository root (package.json, tsconfig.json)
  - Tests:
    - it should create package.json with scripts
    - it should create tsconfig.json with strict settings
    - it should fail clearly if files already exist
- [ ] T002 [P] Add linting/formatting config (eslint/prettier) in repo root
  - Tests:
    - it should lint TypeScript sources
    - it should format files consistently
    - it should fail on lint errors in CI mode
- [ ] T003 Add Vitest config for unit/integration/contract tests in repo root
  - Tests:
    - it should discover unit tests under tests/unit
    - it should discover integration tests under tests/integration
    - it should run contract tests under tests/contract
- [ ] T004 Create base folder structure per plan in `src/` and `tests/`
  - Tests:
    - it should create all directories listed in plan
    - it should not overwrite existing files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T005 Setup configuration loader in `src/core/config.ts`
  - Tests:
    - it should load defaults and override with env
    - it should validate required config keys
    - it should surface missing config with clear error
- [ ] T006 [P] Implement logging utility in `src/core/logger.ts`
  - Tests:
    - it should log at info/warn/error levels
    - it should redact sensitive values
    - it should format logs consistently
- [ ] T007 [P] Implement error types and error mapping in `src/core/errors.ts`
  - Tests:
    - it should map Gmail errors to domain errors
    - it should map validation errors to user-safe messages
    - it should preserve original error context

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Browse and filter inbox (Priority: P1) 🎯 MVP

**Goal**: Show inbox list sorted by date and enable filters for sender/date/label/category

**Independent Test**: Connect inbox, load list, apply filters, verify results and unread highlighting

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

- [x] T008 [P] [US1] Contract test for list emails in `tests/contract/emails_list.test.ts`
  - Tests:
    - it should return a list with required fields
    - it should honor sender/date/label/category filters
    - it should return an empty list when no matches
- [x] T009 [P] [US1] Integration test for filter workflow in `tests/integration/filter_workflow.test.ts`
  - Tests:
    - it should load inbox then apply filters end-to-end
    - it should update list and unread emphasis after filter
    - it should handle no-match filters with empty state

### Implementation for User Story 1

- [x] T010 [P] [US1] Create Email entity in `src/core/entities.ts`
  - Tests:
    - it should require message_id and received_at
    - it should default is_read to false when missing
    - it should reject invalid timestamps
- [x] T011 [P] [US1] Create Gmail adapter client in `src/adapters/gmail/client.ts`
  - Tests:
    - it should initialize with least-privilege scopes
    - it should handle auth failures gracefully
    - it should expose a reusable client instance
- [x] T012 [P] [US1] Implement email list service in `src/services/email_list_service.ts`
  - Tests:
    - it should return emails sorted by received_at desc
    - it should apply sender/date/label/category filters
    - it should handle empty inbox
- [x] T013 [P] [US1] Implement filter builder in `src/services/filter_service.ts`
  - Tests:
    - it should build filter criteria from inputs
    - it should ignore empty filter values
    - it should combine filters correctly
- [x] T014 [US1] Implement Gmail list adapter call in `src/adapters/gmail/list_emails.ts`
  - Tests:
    - it should request only inbox messages
    - it should paginate until page limit or completion
    - it should handle rate-limit backoff
- [x] T015 [US1] Implement TUI inbox list view in `src/tui/inbox_list.ts`
  - Tests:
    - it should render a list of emails
    - it should highlight unread emails
    - it should update when data changes
- [x] T016 [US1] Wire filters to list view in `src/tui/inbox_filters.ts`
  - Tests:
    - it should complete successfully
    - it should handle error conditions
- [ ] T017 [US1] Add unread emphasis rendering in `src/tui/inbox_list.ts`
  - Tests:
    - it should render unread in bold
    - it should render read in normal weight

**Checkpoint**: User Story 1 functional and testable independently

---

## Phase 4: User Story 2 - Natural-language email search (Priority: P2)

**Goal**: Allow natural-language queries to filter email list

**Independent Test**: Submit a natural-language query and verify list updates and empty state

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

- [ ] T018 [P] [US2] Contract test for query endpoint in `tests/contract/query_emails.test.ts`
  - Tests:
    - it should accept a natural-language query string
    - it should return filtered results only
    - it should return empty list for no matches
- [ ] T019 [P] [US2] Integration test for NL query workflow in `tests/integration/nl_query_workflow.test.ts`
  - Tests:
    - it should run NL query and update list results
    - it should show empty state when no results
    - it should preserve prior filters when query cleared

### Implementation for User Story 2

- [ ] T020 [P] [US2] Implement NL query parser in `src/services/nl_query_service.ts`
  - Tests:
    - it should parse common intent phrases
    - it should return a structured query object
    - it should return a no-op for empty input
- [ ] T021 [US2] Connect NL query to Gmail list in `src/services/email_list_service.ts`
  - Tests:
    - it should complete successfully
    - it should handle error conditions
- [ ] T022 [US2] Implement empty-state view in `src/tui/empty_state.ts`
  - Tests:
    - it should render when list is empty
    - it should include a clear no-results message
- [ ] T023 [US2] Wire NL query input in `src/tui/nl_query_input.ts`
  - Tests:
    - it should capture user input
    - it should submit query on enter
    - it should clear input on reset

**Checkpoint**: User Story 2 functional and testable independently

---

## Phase 5: User Story 3 - Review and act on emails (Priority: P3)

**Goal**: Preview email contents and apply labels/archive/delete with confirmation

**Independent Test**: Select emails, preview content, confirm actions and verify Gmail updates

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

- [ ] T024 [P] [US3] Contract test for email detail in `tests/contract/email_detail.test.ts`
  - Tests:
    - it should return full content for a valid message_id
    - it should return 404 for unknown message_id
    - it should include body and headers when available
- [ ] T025 [P] [US3] Contract tests for actions in `tests/contract/email_actions.test.ts`
  - Tests:
    - it should accept multiple message_ids
    - it should reject empty message_ids
    - it should return success after action completes
- [ ] T026 [P] [US3] Integration test for action confirmation flow in `tests/integration/action_flow.test.ts`
  - Tests:
    - it should require confirmation before applying action
    - it should apply action to selected emails only
    - it should reflect updated state after action

### Implementation for User Story 3

- [ ] T027 [P] [US3] Implement email detail fetch in `src/adapters/gmail/get_email.ts`
  - Tests:
    - it should fetch full body for a message_id
    - it should return a clear error for missing message
    - it should avoid caching body after session
- [ ] T028 [P] [US3] Implement action service in `src/services/email_action_service.ts`
  - Tests:
    - it should apply label/archive/delete to selected ids
    - it should require confirmation flag before action
    - it should surface per-message failures
- [ ] T029 [US3] Implement confirmation prompt in `src/tui/confirm_prompt.ts`
  - Tests:
    - it should complete successfully
    - it should handle error conditions
- [ ] T030 [US3] Implement email preview panel in `src/tui/email_preview.ts`
  - Tests:
    - it should render subject, sender, and body
    - it should update when selection changes
- [ ] T031 [US3] Wire bulk selection in `src/tui/selection_controls.ts`
  - Tests:
    - it should select all visible emails
    - it should select and deselect individual emails

**Checkpoint**: User Story 3 functional and testable independently

---

## Phase 6: User Story 4 - Save and rerun query workflows (Priority: P4)

**Goal**: Save queries with optional action, order them, and rerun on session start with confirmation

**Independent Test**: Save a query, reopen session, rerun against new emails, confirm action

### Tests for User Story 4 (MANDATORY - Strict TDD) ⚠️

- [ ] T032 [P] [US4] Contract test for saved queries CRUD in `tests/contract/saved_queries.test.ts`
  - Tests:
    - it should create a saved query with required fields
    - it should update order_index and action fields
    - it should reject missing query_text
- [ ] T033 [P] [US4] Integration test for rerun workflow in `tests/integration/rerun_workflow.test.ts`
  - Tests:
    - it should rerun saved queries since last session
    - it should prompt before applying saved actions
    - it should record last_run_at after completion

### Implementation for User Story 4

- [ ] T034 [P] [US4] Create storage adapter skeleton in `src/adapters/storage/sqlite.ts`
  - Tests:
    - it should open or create the local database file
    - it should initialize schema if missing
    - it should close connections cleanly
- [ ] T035 [P] [US4] Add SavedQuery and UserSession entities in `src/core/entities.ts`
  - Tests:
    - it should require query_text and order_index
    - it should require action_label when action_type=label
    - it should validate last_session_at <= started_at
- [ ] T036 [P] [US4] Implement data access layer for saved queries in `src/adapters/storage/saved_queries_repo.ts`
  - Tests:
    - it should create and retrieve saved queries
    - it should update order_index and action fields
    - it should delete a saved query by id
- [ ] T037 [P] [US4] Implement data access layer for sessions in `src/adapters/storage/sessions_repo.ts`
  - Tests:
    - it should complete successfully
    - it should handle error conditions
- [ ] T038 [P] [US4] Implement saved query service in `src/services/saved_query_service.ts`
  - Tests:
    - it should save a query with optional action
    - it should update query order
    - it should validate required fields
- [ ] T039 [P] [US4] Implement workflow runner in `src/services/workflow_runner.ts`
  - Tests:
    - it should run saved queries in order
    - it should filter to emails since last session
    - it should record last_run_at after run
- [ ] T040 [US4] Implement saved query UI in `src/tui/saved_queries_panel.ts`
  - Tests:
    - it should list saved queries in order
    - it should show associated action if present
- [ ] T041 [US4] Implement reorder controls in `src/tui/query_order_controls.ts`
  - Tests:
    - it should move a query up or down
    - it should persist new order
- [ ] T042 [US4] Implement session start prompt in `src/tui/session_prompt.ts`
  - Tests:
    - it should prompt to rerun saved queries
    - it should respect user opt-out

**Checkpoint**: User Story 4 functional and testable independently

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T043 [P] Add docs updates in `docs/`
  - Tests:
    - it should reflect current commands and flows
    - it should include prerequisites and setup steps
- [ ] T044 [P] Add performance optimizations in `src/services/`
  - Tests:
    - it should reduce list load time
    - it should not change visible behavior
- [ ] T045 [P] Add additional unit tests in `tests/unit/`
  - Tests:
    - it should cover uncovered branches
    - it should include boundary cases
- [ ] T046 [P] Add security hardening checks in `src/core/`
  - Tests:
    - it should avoid logging credentials
    - it should validate destructive actions require confirm
- [ ] T047 Run quickstart validation steps in `specs/001-smart-inbox-organizer/quickstart.md`
  - Tests:
    - it should complete the documented steps successfully
    - it should report any missing prerequisites


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
