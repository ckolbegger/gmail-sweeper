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

- [ ] T007 [P] Create SQLite database schema for emails and labels in src/core/persistence/migrations/001_initial.sql
  - Tests:
    - it should create emails table with all required columns
    - it should create labels table with all required columns
    - it should create indexes for performance
    - it should support foreign key constraints

- [ ] T008 [P] Implement database connection and migration runner in src/core/persistence/database.ts
  - Tests:
    - it should connect to SQLite database file
    - it should run migrations on first connect
    - it should handle migration failures gracefully
    - it should support transaction rollback

- [ ] T009 [P] Create Zod validation schemas for Email and Label in src/core/models/validation.ts
  - Tests:
    - it should validate valid Email objects
    - it should reject invalid Email objects
    - it should validate valid Label objects
    - it should reject invalid Label objects
    - it should handle boundary values (empty strings, max lengths)

### Core Models (MVP-Only)

- [ ] T010 [P] Create Email model types and validation in src/core/models/email.ts
  - Tests:
    - it should define Email interface with all required fields
    - it should validate email addresses format
    - it should handle optional fields correctly
    - it should parse Gmail API response to Email model

- [ ] T014 [P] Create Label model types and validation in src/core/models/label.ts
  - Tests:
    - it should define Label interface with all required fields
    - it should distinguish system vs user labels
    - it should handle optional color fields

- [ ] T015 Create models barrel export (Email, Label only) in src/core/models/index.ts

### Shared Contracts (MVP-Only)

- [ ] T016 [P] Create shared type definitions in src/core/contracts/types.ts
  - Tests:
    - it should export all shared domain types
    - it should define pagination types correctly
    - it should define sort/filter types correctly

- [ ] T017 [P] Create Gmail API contract interfaces in src/core/contracts/gmail-api.ts
  - Tests:
    - it should define GmailClient interface with all methods
    - it should define AuthManager interface
    - it should define error types correctly

- [ ] T020 Create contracts barrel export in src/core/contracts/index.ts

### Error Handling & Logging (Minimal)

- [ ] T021 [P] Implement minimal error classes (GmailError only) in src/core/errors/index.ts
  - Tests:
    - it should create GmailError with code and message
    - it should preserve error cause chain
    - it should support all GmailErrorCode values

- [ ] T022 [P] Implement minimal logging wrapper (console-based) in src/core/logging/index.ts
  - Tests:
    - it should log messages at different levels
    - it should format log messages consistently
    - it should handle null/undefined messages gracefully

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
  - Tests:
    - it should save email to database
    - it should retrieve email by ID
    - it should list emails with pagination
    - it should update email read status
    - it should delete email from database
    - it should handle database errors gracefully

- [ ] T028 [US1] Implement LabelRepository for label caching in src/core/services/label-repository.ts
  - Tests:
    - it should cache labels from Gmail
    - it should retrieve label by ID
    - it should list all labels
    - it should sync labels with Gmail API
    - it should handle label not found

#### Gmail API Service

- [ ] T029 [US1] Implement AuthManager for OAuth2 flow in src/core/services/auth-manager.ts
  - Tests:
    - it should generate OAuth2 authorization URL
    - it should exchange authorization code for tokens
    - it should refresh expired access tokens
    - it should check authentication status
    - it should revoke authentication on logout
    - it should persist tokens securely

- [ ] T030 [US1] Implement GmailClient for email fetching in src/core/services/gmail-client.ts
  - Tests:
    - it should fetch emails from Gmail API
    - it should handle rate limiting with exponential backoff
    - it should parse Gmail API response to Email model
    - it should fetch email content by ID
    - it should handle API errors gracefully
    - it should authenticate requests with valid token

- [ ] T031 [US1] Implement email sync operations (full and incremental) in src/core/services/gmail-client.ts
  - Tests:
    - it should perform full sync of all emails
    - it should perform incremental sync using history ID
    - it should report sync progress
    - it should handle sync interruptions gracefully
    - it should update local database after sync

#### Core Services

- [ ] T032 [US1] Implement email sorting service in src/core/services/email-sorter.ts
  - Tests:
    - it should sort emails by date descending (default)
    - it should sort emails by date ascending
    - it should sort emails by sender alphabetically
    - it should sort emails by subject alphabetically
    - it should handle null/undefined dates gracefully

- [ ] T033 [US1] Implement email filtering service in src/core/services/email-filter.ts
  - Tests:
    - it should filter by sender email address
    - it should filter by date range
    - it should filter by label
    - it should filter by read/unread status
    - it should combine multiple filters with AND logic
    - it should handle empty filter results

#### CLI Components

- [ ] T034 [P] [US1] Create EmailList TUI component in src/cli/components/email-list.tsx
  - Tests:
    - it should render list of emails
    - it should highlight selected email
    - it should display unread emails in bold
    - it should show email subject, sender, and date
    - it should handle empty list state
    - it should support keyboard navigation (up/down)
    - it should scroll when list exceeds viewport

- [ ] T035 [P] [US1] Create EmailDetail TUI component in src/cli/components/email-detail.tsx
  - Tests:
    - it should display email subject, sender, recipients
    - it should render email body text
    - it should show email labels
    - it should display email date in readable format
    - it should handle emails without body content

- [ ] T036 [US1] Create keyboard navigation hook in src/cli/hooks/use-keyboard.ts
  - Tests:
    - it should register keyboard event listeners
    - it should call handler on key press
    - it should support key combinations
    - it should cleanup listeners on unmount
    - it should prevent default for handled keys

- [ ] T037 [US1] Implement main CLI app structure in src/cli/app.tsx
  - Tests:
    - it should render without crashing
    - it should initialize with loading state
    - it should display error on auth failure
    - it should render email list after sync

- [ ] T038 [US1] Create CLI entry point in src/cli/index.ts

#### Integration

- [ ] T039 [US1] Wire up email list display with Gmail sync in src/cli/app.tsx
  - Tests:
    - it should trigger sync on app start
    - it should display progress during sync
    - it should show emails after sync completes
    - it should handle sync errors gracefully

- [ ] T040 [US1] Implement sort commands (date, sender, label, category) in src/cli/components/email-list.tsx
  - Tests:
    - it should sort on keyboard shortcut
    - it should update sort indicator in UI
    - it should toggle sort direction on repeated press

- [ ] T041 [US1] Implement filter commands in src/cli/components/email-list.tsx
  - Tests:
    - it should open filter dialog on shortcut
    - it should apply filter and update list
    - it should show active filter indicator
    - it should allow clearing filters

- [ ] T042 [US1] Add visual distinction for unread emails (bold text) in src/cli/components/email-list.tsx
  - Tests:
    - it should render unread emails in bold
    - it should render read emails in normal weight
    - it should update visual state when marked read

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

### Story-Level Integration Tests for User Story 1

> **Write after implementation is complete** to verify the full user flow

- [ ] T132 [US1] End-to-end test for browsing and filtering inbox in tests/e2e/us1-browse-filter.test.ts
  - Tests:
    - it should complete flow: auth → sync → display emails → sort → filter
    - it should handle empty inbox gracefully
    - it should recover from network errors during sync
    - it should persist sort/filter preferences across sessions

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

#### Query Model & Contracts (Deferred from Phase 2)

- [ ] T046 [P] [US2] Create Query model types and validation in src/core/models/query.ts
- [ ] T047 [P] [US2] Create NL Query contract interfaces in src/core/contracts/nl-query.ts
- [ ] T048 [P] [US2] Add Query to models barrel export in src/core/models/index.ts
- [ ] T049 [P] [US2] Add NLQueryError to error classes in src/core/errors/index.ts

#### Query Engine

- [ ] T050 [US2] Implement Ollama client wrapper in src/core/services/ollama-client.ts
  - Tests:
    - it should connect to Ollama server
    - it should send prompts and receive responses
    - it should handle connection errors gracefully
    - it should timeout on slow responses
    - it should retry on transient failures

- [ ] T051 [US2] Implement NLQueryEngine for semantic search in src/core/services/nl-query-engine.ts
  - Tests:
    - it should execute natural language queries
    - it should return scored email matches
    - it should interpret query intent correctly
    - it should handle ambiguous queries
    - it should return empty results when no matches
    - it should complete within 5 seconds (SC-008)

- [ ] T052 [US2] Implement query result caching in src/core/services/nl-query-engine.ts
  - Tests:
    - it should cache query results
    - it should return cached results for identical queries
    - it should expire cache after TTL
    - it should invalidate cache on email sync

- [ ] T053 [US2] Implement query explanation feature in src/core/services/nl-query-engine.ts
  - Tests:
    - it should explain interpreted intent
    - it should extract keywords from query
    - it should suggest possible categories
    - it should provide confidence score

#### Query Repository

- [ ] T054 [US2] Implement QueryRepository for saved queries in src/core/services/query-repository.ts
  - Tests:
    - it should save query to database
    - it should retrieve query by ID
    - it should list all saved queries
    - it should update query metadata
    - it should delete query from database
    - it should increment run count on execution

#### CLI Components

- [ ] T055 [US2] Create QueryInput TUI component in src/cli/components/query-input.tsx
  - Tests:
    - it should render query input field
    - it should accept text input
    - it should submit on Enter key
    - it should show query execution status
    - it should display query suggestions
    - it should handle empty input gracefully

- [ ] T056 [US2] Integrate NL query input with email list filtering in src/cli/app.tsx
  - Tests:
    - it should pass query to NLQueryEngine
    - it should update email list with results
    - it should show loading state during query
    - it should display result count

- [ ] T057 [US2] Add query execution status display in src/cli/components/query-input.tsx
  - Tests:
    - it should show "thinking" indicator during query
    - it should display execution time
    - it should show interpretation confidence
    - it should display error on query failure

#### Integration

- [ ] T058 [US2] Wire up natural language queries to filter email list in src/cli/app.tsx
  - Tests:
    - it should filter email list based on NL query results
    - it should maintain sort order after filtering
    - it should allow clearing NL filter
    - it should combine NL filter with manual filters

- [ ] T059 [US2] Implement email detail pane display when email selected in src/cli/components/email-detail.tsx
  - Tests:
    - it should show full email content on selection
    - it should render HTML body as text
    - it should display email headers
    - it should handle large email bodies

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

### Story-Level Integration Tests for User Story 2

> **Write after implementation is complete** to verify the full user flow

- [ ] T133 [US2] End-to-end test for natural language search flow in tests/e2e/us2-nl-search.test.ts
  - Tests:
    - it should complete flow: enter query → execute → display results → view email detail
    - it should handle queries with no matches gracefully
    - it should cache results for repeated queries
    - it should handle Ollama unavailable gracefully
    - it should achieve 80% relevance for test queries (SC-002)

---

## Phase 5: User Story 3 - Email Actions (Priority: P1) 🎯 MVP

**Goal**: Select emails and apply actions (label, archive, delete) to manage inbox efficiently

**Independent Test**: Select individual or all emails and apply labels, archive, or delete them, then verify actions are reflected in Gmail

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T060 [P] [US3] Unit test for email selection logic in tests/unit/core/email-selection.test.ts
- [ ] T061 [P] [US3] Integration test for email actions flow in tests/integration/email-actions.test.ts
- [ ] T062 [P] [US3] Contract test for Gmail batch actions in tests/contract/gmail-actions.test.ts

### Implementation for User Story 3

#### Selection Logic

- [ ] T063 [US3] Implement email selection state management in src/core/services/selection-service.ts
  - Tests:
    - it should select single email by ID
    - it should deselect email by ID
    - it should select all emails in list
    - it should clear all selections
    - it should toggle selection state
    - it should return selected email IDs

#### Gmail Actions

- [ ] T064 [US3] Implement label application in src/core/services/gmail-client.ts
  - Tests:
    - it should apply label to single email
    - it should apply label to multiple emails
    - it should create label if not exists
    - it should handle label application errors
    - it should verify label applied in Gmail

- [ ] T065 [US3] Implement archive operation in src/core/services/gmail-client.ts
  - Tests:
    - it should archive single email
    - it should archive multiple emails
    - it should remove INBOX label
    - it should handle archive errors

- [ ] T066 [US3] Implement delete (trash) operation in src/core/services/gmail-client.ts
  - Tests:
    - it should move email to trash
    - it should handle delete errors
    - it should require confirmation for bulk delete

- [ ] T067 [US3] Implement batch action handling with progress in src/core/services/gmail-client.ts
  - Tests:
    - it should process emails in batches
    - it should report progress during batch operation
    - it should handle partial failures
    - it should retry failed items
    - it should complete within reasonable time

#### CLI Components

- [ ] T068 [US3] Add keyboard shortcuts for selection (Space, a) in src/cli/hooks/use-keyboard.ts
  - Tests:
    - it should toggle selection on Space
    - it should select all on 'a' key
    - it should clear selection on 'c' key
    - it should handle keyboard events in list context

- [ ] T069 [US3] Add action keyboard shortcuts (l, e, d) in src/cli/hooks/use-keyboard.ts
  - Tests:
    - it should trigger label action on 'l'
    - it should trigger archive on 'e'
    - it should trigger delete on 'd'
    - it should require confirmation for destructive actions

- [ ] T070 [US3] Create action confirmation dialog in src/cli/components/action-dialog.tsx
  - Tests:
    - it should display action description
    - it should show affected email count
    - it should confirm on Enter/Yes
    - it should cancel on Escape/No
    - it should display action progress
    - it should show completion status

- [ ] T071 [US3] Add visual selection indicators in src/cli/components/email-list.tsx
  - Tests:
    - it should show checkbox for selected emails
    - it should highlight selected row
    - it should show selection count in status bar
    - it should update on selection change

#### Integration

- [ ] T072 [US3] Wire up selection and actions to Gmail API in src/cli/app.tsx
  - Tests:
    - it should enable action shortcuts when emails selected
    - it should disable actions when no selection
    - it should update email list after action
    - it should sync action result to Gmail

- [ ] T073 [US3] Implement action confirmation for destructive operations in src/cli/app.tsx
  - Tests:
    - it should show confirmation for archive
    - it should show confirmation for delete
    - it should not require confirmation for label
    - it should allow "don't ask again" option

- [ ] T074 [US3] Add action progress feedback in src/cli/components/action-dialog.tsx
  - Tests:
    - it should show progress bar during batch operations
    - it should display current/total count
    - it should show estimated time remaining
    - it should allow cancellation
    - it should show success/failure summary

**Checkpoint**: MVP Complete (User Stories 1-3) - Core inbox management workflow functional

### Story-Level Integration Tests for User Story 3

> **Write after implementation is complete** to verify the full user flow

- [ ] T134 [US3] End-to-end test for email actions flow in tests/e2e/us3-email-actions.test.ts
  - Tests:
    - it should complete flow: select emails → apply label → verify in Gmail
    - it should complete flow: select emails → archive → verify removed from inbox
    - it should complete flow: select emails → delete → verify in trash
    - it should handle partial failures gracefully
    - it should allow undo within 5 seconds
    - it should complete action in under 2 minutes for 100 emails (SC-003)

---

## Phase 6: User Story 4 - Save Queries and Actions (Priority: P2)

**Goal**: Save natural language queries along with their associated actions for reuse

**Independent Test**: Run a natural language query, apply actions to results, save the query-action pair, and verify it appears in saved workflows

### Tests for User Story 4 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T075 [P] [US4] Unit test for WorkflowRepository in tests/unit/core/workflow-repository.test.ts
- [ ] T076 [P] [US4] Integration test for workflow creation flow in tests/integration/workflow-create.test.ts

### Implementation for User Story 4

#### Workflow Model & Contracts (Deferred from Phase 2)

- [ ] T077 [P] [US4] Create Workflow model types and validation in src/core/models/workflow.ts
- [ ] T078 [P] [US4] Create Workflow contract interfaces in src/core/contracts/workflow.ts
- [ ] T079 [P] [US4] Add Workflow to models barrel export in src/core/models/index.ts
- [ ] T080 [P] [US4] Add WorkflowError to error classes in src/core/errors/index.ts

#### Workflow Repository

- [ ] T081 [US4] Implement WorkflowRepository in src/core/services/workflow-repository.ts
  - Tests:
    - it should save workflow to database
    - it should retrieve workflow by ID
    - it should list all workflows
    - it should update workflow action
    - it should delete workflow
    - it should reorder workflows by execution order

- [ ] T082 [US4] Implement workflow CRUD operations in src/core/services/workflow-repository.ts
  - Tests:
    - it should validate workflow before save
    - it should enforce unique workflow names
    - it should cascade delete on query deletion

#### Workflow Engine

- [ ] T083 [US4] Implement workflow creation from current query in src/core/services/workflow-engine.ts
  - Tests:
    - it should create workflow from current query
    - it should capture selected action
    - it should allow custom workflow name
    - it should validate query exists before creating

- [ ] T084 [US4] Implement workflow action association in src/core/services/workflow-engine.ts
  - Tests:
    - it should associate LABEL action with label ID
    - it should associate ARCHIVE action
    - it should associate DELETE action
    - it should validate action parameters

#### CLI Components

- [ ] T085 [US4] Create WorkflowList TUI component in src/cli/components/workflow-list.tsx
  - Tests:
    - it should render list of saved workflows
    - it should show workflow name and action type
    - it should allow reordering workflows
    - it should toggle workflow enabled state
    - it should edit workflow on selection
    - it should delete workflow with confirmation

- [ ] T086 [US4] Create workflow save dialog in src/cli/components/workflow-save-dialog.tsx
  - Tests:
    - it should pre-fill with current query
    - it should capture workflow name
    - it should select action type
    - it should configure action parameters
    - it should validate before save
    - it should confirm on successful save

- [ ] T087 [US4] Add workflow keyboard shortcuts (w, W) in src/cli/hooks/use-keyboard.ts
  - Tests:
    - it should open save dialog on 'w'
    - it should open workflow list on 'W'
    - it should only work when query active

#### Integration

- [ ] T088 [US4] Wire up workflow save functionality in src/cli/app.tsx
  - Tests:
    - it should pass current query to save dialog
    - it should refresh workflow list after save
    - it should show success notification
    - it should handle save errors gracefully

- [ ] T089 [US4] Implement workflow list view in src/cli/app.tsx
  - Tests:
    - it should display workflows from repository
    - it should update on workflow changes
    - it should navigate back to inbox

- [ ] T090 [US4] Add workflow editing capability in src/cli/components/workflow-list.tsx
  - Tests:
    - it should open edit dialog on selection
    - it should update workflow name
    - it should change associated action
    - it should save changes to database

**Checkpoint**: User Story 4 complete - Workflows can be saved and managed

### Story-Level Integration Tests for User Story 4

> **Write after implementation is complete** to verify the full user flow

- [ ] T135 [US4] End-to-end test for workflow creation and management in tests/e2e/us4-workflow-management.test.ts
  - Tests:
    - it should complete flow: run query → save as workflow → view in list → edit → delete
    - it should persist workflows across app restarts
    - it should allow reordering workflows
    - it should enable/disable workflows
    - it should validate workflow name uniqueness

---

## Phase 7: User Story 5 - Automated Session Workflows (Priority: P2)

**Goal**: Saved queries automatically run against new emails when opening a session

**Independent Test**: Save queries, close session, receive new emails, reopen app, and verify user is prompted to run saved queries against emails received since last session

### Tests for User Story 5 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T091 [P] [US5] Unit test for SessionService in tests/unit/core/session-service.test.ts
- [ ] T092 [P] [US5] Integration test for session workflow automation in tests/integration/session-workflows.test.ts
- [ ] T093 [P] [US5] Unit test for workflow execution engine in tests/unit/core/workflow-execution.test.ts

### Implementation for User Story 5

#### Session Model & Management (Deferred from Phase 2)

- [ ] T094 [P] [US5] Create Session model types and validation in src/core/models/session.ts
  - Tests:
    - it should define Session interface with required fields
    - it should validate session timestamps
    - it should track last email check time

- [ ] T095 [P] [US5] Add Session to models barrel export in src/core/models/index.ts

- [ ] T096 [P] [US5] Update database schema for session tracking in src/core/persistence/migrations/002_add_sessions.sql
  - Tests:
    - it should create sessions table
    - it should create workflow_executions table
    - it should add foreign key constraints

- [ ] T097 [US5] Implement SessionRepository in src/core/services/session-repository.ts
  - Tests:
    - it should create new session
    - it should retrieve current session
    - it should end session with timestamp
    - it should get last session timestamp
    - it should update last email check time

- [ ] T098 [US5] Implement SessionService for tracking in src/core/services/session-service.ts
  - Tests:
    - it should start new session on app launch
    - it should end session on app exit
    - it should track session duration
    - it should handle session recovery

- [ ] T099 [US5] Implement last session timestamp tracking in src/core/services/session-service.ts
  - Tests:
    - it should record last email check timestamp
    - it should calculate time since last session
    - it should detect new emails since last session

#### Workflow Execution

- [ ] T100 [US5] Implement workflow execution engine in src/core/services/workflow-engine.ts
  - Tests:
    - it should execute workflow against email set
    - it should apply workflow action to matched emails
    - it should log execution results
    - it should handle execution errors gracefully
    - it should respect execution order

- [ ] T101 [US5] Implement workflow ordering and sequencing in src/core/services/workflow-engine.ts
  - Tests:
    - it should execute workflows in specified order
    - it should skip disabled workflows
    - it should handle dependencies between workflows
    - it should allow reordering at runtime

- [ ] T102 [US5] Implement ExecutionRepository for logging in src/core/services/execution-repository.ts
  - Tests:
    - it should log workflow execution start
    - it should log execution completion
    - it should record emails matched and processed
    - it should track execution duration
    - it should query execution history

- [ ] T103 [US5] Implement conflict resolution for multiple workflows in src/core/services/workflow-engine.ts
  - Tests:
    - it should detect conflicting actions on same email
    - it should apply first-wins strategy by default
    - it should allow manual conflict resolution
    - it should log conflict resolutions

#### New Email Detection

- [ ] T104 [US5] Implement new email detection since last session in src/core/services/gmail-client.ts
  - Tests:
    - it should query emails since timestamp
    - it should use history ID for efficient sync
    - it should handle first session (no prior timestamp)
    - it should detect new emails across folders

- [ ] T105 [US5] Implement workflow prompt logic for new emails in src/core/services/workflow-engine.ts
  - Tests:
    - it should check for new emails on session start
    - it should count emails matching each workflow
    - it should generate prompt message
    - it should skip prompt if no new emails

#### CLI Components

- [ ] T106 [US5] Create session startup workflow prompt in src/cli/components/session-prompt.tsx
  - Tests:
    - it should display new email count per workflow
    - it should show total emails to process
    - it should allow running all workflows
    - it should allow selecting specific workflows
    - it should allow skipping workflow run

- [ ] T107 [US5] Create workflow execution progress view in src/cli/components/workflow-progress.tsx
  - Tests:
    - it should show current workflow name
    - it should display progress bar
    - it should show emails processed / total
    - it should display current action being applied
    - it should allow canceling execution
    - it should show completion summary

#### Integration

- [ ] T108 [US5] Wire up session startup workflow detection in src/cli/app.tsx
  - Tests:
    - it should check for new emails after sync
    - it should show prompt when new emails found
    - it should skip prompt if no workflows enabled
    - it should handle prompt dismissal

- [ ] T109 [US5] Implement workflow confirmation before apply in src/cli/app.tsx
  - Tests:
    - it should preview actions before applying
    - it should show email samples for each workflow
    - it should require confirmation for destructive actions
    - it should allow editing workflow before run

- [ ] T110 [US5] Add workflow execution progress display in src/cli/app.tsx
  - Tests:
    - it should show progress during execution
    - it should update email list after workflow completion
    - it should display success/failure summary
    - it should handle execution cancellation

**Checkpoint**: All user stories complete - Full automation workflow functional

### Story-Level Integration Tests for User Story 5

> **Write after implementation is complete** to verify the full user flow

- [ ] T136 [US5] End-to-end test for automated session workflows in tests/e2e/us5-session-automation.test.ts
  - Tests:
    - it should complete flow: close app → receive emails → reopen → detect new → run workflows → apply actions
    - it should handle no new emails gracefully
    - it should allow selective workflow execution
    - it should log all executions for audit
    - it should handle workflow conflicts correctly
    - it should reduce manual actions by 50% for test scenarios (SC-006)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Build & Distribution

- [ ] T111 [P] Create build script for binary compilation in scripts/build-binary.ts
- [ ] T112 [P] Configure pkg or deno compile for single executable output
- [ ] T113 [P] Add CI/CD workflow for automated builds in .github/workflows/build.yml

### Documentation

- [ ] T114 [P] Update README.md with installation and usage instructions
- [ ] T115 [P] Create architecture documentation in docs/architecture.md
- [ ] T116 [P] Add JSDoc comments to all public APIs

### Testing & Quality

- [ ] T117 [P] Add comprehensive unit tests for all services in tests/unit/core/
- [ ] T118 [P] Add CLI component tests in tests/unit/cli/
- [ ] T119 [P] Add end-to-end test suite in tests/e2e/
- [ ] T120 [P] Achieve >80% code coverage

### Performance & Optimization

- [ ] T121 [P] Implement email list virtualization for large inboxes in src/cli/components/email-list.tsx
- [ ] T122 [P] Add database query optimization and indexing verification
- [ ] T123 [P] Implement request batching for Gmail API in src/core/services/gmail-client.ts

### Error Handling & Reliability

- [ ] T124 [P] Add comprehensive error boundaries in CLI components
- [ ] T125 [P] Implement retry logic for Gmail API failures in src/core/services/gmail-client.ts
- [ ] T126 [P] Add graceful degradation when Ollama is unavailable in src/core/services/nl-query-engine.ts

### Security

- [ ] T127 [P] Audit OAuth2 token storage security
- [ ] T128 [P] Add input sanitization for all user inputs
- [ ] T129 [P] Implement secure credential storage verification

### Quickstart Validation

- [ ] T130 Run through quickstart.md validation - ensure all commands work
- [ ] T131 Test binary distribution on clean machine

---

## Test Coverage Summary

### Unit Tests by Component Type

| Component Type | Tasks | Test Categories Covered |
|---------------|-------|------------------------|
| UI Components (TUI) | T034, T035, T055, T070, T085, T086, T106, T107 | render, interaction, state, accessibility |
| Services | T027-T028, T029-T031, T032-T033, T050-T053, T054, T063, T064-T067, T081-T082, T083-T084, T097-T099, T100-T103, T104, T105 | CRUD, validation, error handling, state changes |
| Repositories | T027-T028, T054, T081-T082, T097, T102 | persistence, queries, transactions |
| Validators | T009-T010, T046, T077, T094 | valid/invalid cases, boundaries, edge cases |
| Hooks | T036, T068-T069, T087 | event handling, state, cleanup |

### Integration Tests by Story

| Story | Integration Tests | Coverage |
|-------|-------------------|----------|
| US1 | T025, T039, T132 | email listing, sync, sort/filter, e2e |
| US2 | T044, T056-T058, T133 | NL search, query execution, caching, e2e |
| US3 | T061, T072-T074, T134 | email actions, batch operations, confirmation, e2e |
| US4 | T076, T088-T090, T135 | workflow CRUD, save/edit/delete, e2e |
| US5 | T092, T108-T110, T136 | session tracking, automation, conflict resolution, e2e |

### Test Count Guidelines Met

- **UI Components**: 6-8 tests each ✓
- **Services**: 5-7 tests each ✓
- **Validators**: 4-6 tests each ✓
- **Integration Tests**: 4-6 tests per story ✓

### Success Criteria Test Coverage

| Success Criterion | Test Tasks |
|-------------------|------------|
| SC-001: NL query under 30s | T051 (performance), T133 (e2e) |
| SC-002: 80% relevance | T133 (e2e validation) |
| SC-003: Complete task under 2min | T134 (e2e timing) |
| SC-004: Support 50K emails | T110 (virtualization), T122 (optimization) |
| SC-005: 90% create workflow | T135 (e2e validation) |
| SC-006: 50% reduction manual actions | T136 (e2e measurement) |
| SC-007: Render in under 3s | T039 (performance) |
| SC-008: NL query under 5s | T051 (performance) |

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
