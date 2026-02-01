# Tasks: Smart Inbox Organizer

**Input**: Design documents from `/specs/001-smart-inbox-organizer/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/core-api.md

**Scope**: TUI MVP (User Stories 1-4). Saved Queries (US5-7) deferred to TUI Fast Follow.

**Tests**: Included per Constitution II (Strict TDD). Write tests first, ensure they fail before implementation.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize Node.js project with package.json per plan.md in /
- [X] T002 Configure TypeScript with tsconfig.json in /
- [X] T003 [P] Configure Vitest with vitest.config.ts in /
- [X] T004 [P] Configure ESLint and Prettier in /
- [X] T005 Create directory structure: src/core/, src/tui/, src/cli/, tests/ per plan.md
- [X] T006 [P] Add .gitignore for node_modules, dist, .env, *.db

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Models

- [X] T007 [P] Create Email interface in src/core/models/index.ts per data-model.md
- [X] T008 [P] Create EmailAddress interface in src/core/models/index.ts
- [X] T009 [P] Create Label and LabelType types in src/core/models/index.ts
- [X] T010 [P] Create Category type in src/core/models/index.ts
- [X] T011 [P] Create Config interface in src/core/models/index.ts
- [X] T012 Create core library barrel export in src/core/index.ts

### Error Classes

- [X] T013 [P] Create GmailSweepError base class in src/core/errors.ts
- [X] T014 [P] Create AuthenticationError class in src/core/errors.ts
- [X] T015 [P] Create GmailAPIError and RateLimitError classes in src/core/errors.ts
- [X] T016 [P] Create NotFoundError class in src/core/errors.ts

### Gmail Authentication

- [X] T017 Write unit test for OAuth2 auth flow in tests/unit/gmail/auth.test.ts
  - Tests:
    - it should generate authorization URL with correct scopes
    - it should exchange authorization code for tokens
    - it should throw AuthenticationError on invalid code
    - it should throw AuthenticationError on network failure
    - it should throw AuthenticationError on timeout
    - it should include offline access for refresh token
- [X] T018 Implement OAuth2 authentication in src/core/gmail/auth.ts using googleapis
- [X] T019 Write unit test for token refresh in tests/unit/gmail/auth.test.ts
  - Tests:
    - it should refresh expired access token using refresh token
    - it should throw AuthenticationError when refresh token is invalid
    - it should return existing token if not expired
    - it should refresh token expiring within 5 minutes (boundary)
    - it should handle refresh during concurrent requests
- [X] T020 Implement token persistence in src/core/gmail/auth.ts (~/.config/gmail-sweep/token.json)
  - Tests:
    - it should save token to config directory
    - it should load token from config directory
    - it should create config directory if not exists
    - it should return null if no token file exists
    - it should throw on permission denied error
    - it should handle corrupted token file gracefully

### Gmail Client (List Messages)

- [X] T021 Write unit test for listMessages in tests/unit/gmail/client.test.ts
  - Tests:
    - it should return array of email metadata
    - it should handle empty inbox (boundary: 0 emails)
    - it should return exactly maxResults when available (boundary)
    - it should paginate when more than maxResults
    - it should handle final page with fewer than maxResults
    - it should throw GmailAPIError on API failure
    - it should throw RateLimitError on 429 response
    - it should throw AuthenticationError on 401 response
- [X] T022 Implement GmailClient constructor in src/core/gmail/client.ts
- [X] T023 Implement GmailClient.authenticate() in src/core/gmail/client.ts
- [X] T024 Implement GmailClient.listMessages() with pagination in src/core/gmail/client.ts
- [X] T025 Implement retry with exponential backoff using p-retry in src/core/gmail/client.ts
  - Tests:
    - it should retry on 5xx errors up to 3 times
    - it should retry on RateLimitError with backoff
    - it should not retry on 4xx errors (except 429)
    - it should throw after max retries exceeded

### Email Cache

- [X] T026 Write unit test for EmailCache in tests/unit/cache/db.test.ts
  - Tests:
    - it should create database file on initialize
    - it should create emails table with correct schema
    - it should create sync_state table
    - it should open existing database without data loss
    - it should handle database locked error
- [X] T027 Implement EmailCache constructor and initialize() in src/core/cache/db.ts
- [X] T028 Implement EmailCache.upsertEmails() in src/core/cache/db.ts
  - Tests:
    - it should insert new emails
    - it should update existing emails by id
    - it should handle empty array (boundary: 0 emails)
    - it should handle single email (boundary: 1 email)
    - it should handle batch of 100+ emails
    - it should handle batch of 1000+ emails efficiently
    - it should preserve existing fields on partial update
    - it should use transaction for atomicity
- [X] T029 Implement EmailCache.getEmails() with sorting in src/core/cache/db.ts
  - Tests:
    - it should return emails sorted by date descending (default)
    - it should sort by sender alphabetically
    - it should sort by subject alphabetically
    - it should handle empty cache
    - it should respect limit parameter (boundary: 0, 1, 100)
- [X] T030 Implement EmailCache.getLastSync() and setLastSync() in src/core/cache/db.ts
  - Tests:
    - it should return null if never synced
    - it should return last sync timestamp after setLastSync
    - it should overwrite previous sync timestamp

### Config Loading

- [X] T031 Write unit test for config loading in tests/unit/config.test.ts
  - Tests:
    - it should load config from ~/.config/gmail-sweep/config.json
    - it should return default config if file not exists
    - it should throw on malformed JSON
    - it should merge partial config with defaults
- [X] T032 Implement loadConfig() in src/core/config.ts
- [X] T033 Implement default config creation in src/core/config.ts
  - Tests:
    - it should create config directory if not exists
    - it should write default config with all required fields
    - it should not overwrite existing config

### CLI Entry Point

- [X] T034 Implement CLI argument parsing with commander in src/cli/index.ts
  - Tests:
    - it should parse --account flag
    - it should show help with --help
    - it should show version with --version
    - it should exit with error on unknown flag
- [X] T035 Implement Gmail account argument handling in src/cli/index.ts
  - Tests:
    - it should use default account if not specified
    - it should validate account exists in config
    - it should throw on unknown account
- [X] T036 Wire CLI to TUI app launch in src/cli/index.ts

### Integration Tests for Foundational Phase

> **Write after implementation is complete** to verify cross-component flows

- [ ] T036a Integration test for Gmail auth + token persistence flow in tests/integration/gmail-auth.test.ts
  - Tests:
    - it should complete OAuth flow and persist token
    - it should load persisted token on subsequent runs
    - it should refresh expired token automatically
- [ ] T036b Integration test for GmailClient + EmailCache sync in tests/integration/gmail-sync.test.ts
  - Tests:
    - it should fetch emails from Gmail and cache locally
    - it should update cache on re-sync
    - it should handle rate limits during sync

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View and Browse Inbox (Priority: P1) 🎯 MVP

**Goal**: Display inbox emails in a list with keyboard navigation and preview pane

**Independent Test**: Connect Gmail account, verify inbox loads with proper sorting, bold unread, and j/k navigation works

### Tests for User Story 1

- [ ] T037 [P] [US1] Write test for EmailList component rendering in tests/unit/tui/EmailList.test.tsx
  - Tests:
    - it should render list of email subjects
    - it should display sender and date for each email
    - it should highlight selected email
    - it should render empty state when no emails
    - it should truncate long subjects (boundary: exactly max length)
    - it should handle 1 email (boundary)
    - it should handle 100+ emails with virtualization
    - it should format relative dates (today, yesterday, older)
- [ ] T038 [P] [US1] Write test for EmailPreview component in tests/unit/tui/EmailPreview.test.tsx
  - Tests:
    - it should display email subject as header
    - it should display sender and recipients
    - it should display email body
    - it should render empty state when no email selected
    - it should handle HTML body conversion to text
    - it should scroll long email body
    - it should show attachment count if present
    - it should handle emails with no body (boundary)
- [ ] T039 [P] [US1] Write test for useKeyboard hook in tests/unit/tui/useKeyboard.test.ts
  - Tests:
    - it should move selection down on j or ArrowDown
    - it should move selection up on k or ArrowUp
    - it should trigger onSelect on Enter
    - it should not move past first item (boundary)
    - it should not move past last item (boundary)
- [ ] T040 [P] [US1] Write test for useGmail hook in tests/unit/tui/useGmail.test.ts
  - Tests:
    - it should return loading state initially
    - it should return emails after fetch
    - it should return error state on failure
    - it should provide refresh function
    - it should deduplicate concurrent refresh calls
    - it should handle pagination (load more)
    - it should cache results to avoid refetch

### Implementation for User Story 1

- [ ] T041 [US1] Create TUI app shell in src/tui/app.tsx using Ink
- [ ] T042 [US1] Implement useKeyboard hook (j/k, arrows, Enter) in src/tui/hooks/useKeyboard.ts
- [ ] T043 [US1] Implement useGmail hook for data fetching in src/tui/hooks/useGmail.ts
- [ ] T044 [US1] Implement EmailList component with scrolling in src/tui/components/EmailList.tsx
  - Tests:
    - it should scroll viewport when selection moves past visible area
    - it should maintain scroll position on re-render
    - it should jump to top on Home key
    - it should jump to bottom on End key
    - it should page down on PageDown
    - it should page up on PageUp
- [ ] T045 [US1] Add bold styling for unread emails in src/tui/components/EmailList.tsx
  - Tests:
    - it should render unread emails in bold
    - it should render read emails in normal weight
- [ ] T046 [US1] Implement GmailClient.getMessage() for full email in src/core/gmail/client.ts
  - Tests:
    - it should return full email with body
    - it should throw NotFoundError for invalid id
    - it should parse multipart messages
    - it should handle text/plain content type
    - it should handle text/html content type
    - it should extract attachments metadata
    - it should handle deeply nested multipart (3+ levels)
- [ ] T047 [US1] Implement EmailPreview component in src/tui/components/EmailPreview.tsx
- [ ] T048 [US1] Implement split-pane layout (list + preview) in src/tui/app.tsx
  - Tests:
    - it should render list and preview side by side
    - it should update preview when selection changes
- [ ] T049 [US1] Create TUI entry point in src/tui/index.tsx
- [ ] T050 [US1] Add loading state indicator in src/tui/app.tsx
  - Tests:
    - it should show spinner while loading
    - it should hide spinner after load complete

### Integration Tests for User Story 1

> **Write after implementation is complete** to verify full user flow

- [ ] T050a [US1] Integration test for inbox viewing flow in tests/integration/view-inbox.test.ts
  - Tests:
    - it should load emails from cache and display in list
    - it should show email preview when navigating with j/k
    - it should update preview on Enter key
- [ ] T050b [US1] Integration test for Gmail sync + TUI display in tests/integration/sync-and-display.test.ts
  - Tests:
    - it should sync emails from Gmail API to cache to TUI
    - it should display loading state during sync
    - it should show error message on sync failure

**Checkpoint**: User Story 1 complete - inbox viewing and browsing works

---

## Phase 4: User Story 2 - Filter and Sort Emails (Priority: P1)

**Goal**: Sort by sender/date/label/category, filter by label/category/sender

**Independent Test**: Apply different sort orders and filters, verify list updates correctly

### Tests for User Story 2

- [ ] T051 [P] [US2] Write test for EmailCache sorting in tests/unit/cache/db.test.ts
  - Tests:
    - it should sort by date ascending
    - it should sort by date descending
    - it should sort by sender alphabetically
    - it should sort by subject alphabetically
    - it should handle emails with same date (stable sort)
- [ ] T052 [P] [US2] Write test for EmailCache filtering in tests/unit/cache/db.test.ts
  - Tests:
    - it should filter by single label
    - it should filter by category
    - it should filter by sender substring
    - it should combine multiple filters (AND logic)
    - it should return empty array when no matches
- [ ] T053 [P] [US2] Write test for sort/filter UI in tests/unit/tui/SortFilterMenu.test.tsx
  - Tests:
    - it should render sort options
    - it should render filter options
    - it should highlight current selection
    - it should close on Esc
    - it should apply selection on Enter

### Implementation for User Story 2

- [ ] T054 [US2] Implement GmailClient.listLabels() in src/core/gmail/client.ts
  - Tests:
    - it should return array of labels
    - it should include system labels (INBOX, SENT, etc.)
    - it should include user-created labels
    - it should handle nested labels (parent/child)
    - it should handle account with no custom labels
    - it should throw GmailAPIError on failure
- [ ] T055 [US2] Extend EmailCache.getEmails() with labelFilter in src/core/cache/db.ts
  - Tests:
    - it should filter emails by label id
    - it should return empty for non-existent label
- [ ] T056 [US2] Extend EmailCache.getEmails() with categoryFilter in src/core/cache/db.ts
  - Tests:
    - it should filter emails by category
    - it should handle CATEGORY_PROMOTIONS, CATEGORY_SOCIAL, etc.
- [ ] T057 [US2] Create SortFilterMenu component in src/tui/components/SortFilterMenu.tsx
  - Tests:
    - it should render as modal overlay
    - it should trap focus within menu
- [ ] T058 [US2] Add 's' key binding for sort menu in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should open sort menu on 's'
    - it should not trigger when input focused
- [ ] T059 [US2] Add 'f' key binding for filter menu in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should open filter menu on 'f'
    - it should not trigger when input focused
- [ ] T060 [US2] Integrate sort/filter with EmailList in src/tui/app.tsx
  - Tests:
    - it should update list when sort changes
    - it should update list when filter applied
    - it should show active filter indicator
- [ ] T061 [US2] Add Esc key to clear filters in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should clear active filter on Esc
    - it should reset sort to default on Esc
    - it should do nothing if no filter active

### Integration Tests for User Story 2

> **Write after implementation is complete** to verify full user flow

- [ ] T061a [US2] Integration test for sort/filter flow in tests/integration/sort-filter.test.ts
  - Tests:
    - it should sort emails by date via 's' menu
    - it should filter by label via 'f' menu
    - it should clear filter on Esc
    - it should persist sort preference across navigation

**Checkpoint**: User Story 2 complete - sorting and filtering works

---

## Phase 5: User Story 3 - Natural Language Search (Priority: P1)

**Goal**: Enter NL query like "find financial offers", display matching emails

**Independent Test**: Enter various NL queries, verify relevant emails returned

### Models for User Story 3

- [ ] T062 [US3] Create ClassificationResult interface in src/core/models/index.ts
- [ ] T063 [US3] Create ClassificationError class in src/core/errors.ts

### Tests for User Story 3

- [ ] T064 [P] [US3] Write test for EmailClassifier interface in tests/unit/search/classifier.test.ts
  - Tests:
    - it should define classify method signature
    - it should return ClassificationResult array
- [ ] T065 [P] [US3] Write test for ClaudeClassifier in tests/unit/search/claude.test.ts
  - Tests:
    - it should send emails to Claude API for classification
    - it should return match scores for each email (0.0 to 1.0)
    - it should throw ClassificationError on API failure
    - it should handle rate limiting with retry
    - it should respect batch size limit
    - it should handle empty email list (boundary: 0)
    - it should truncate very long email bodies
    - it should include email subject and sender in prompt
    - it should handle malformed API response gracefully
- [ ] T066 [P] [US3] Write test for SearchEngine in tests/unit/search/engine.test.ts
  - Tests:
    - it should parse natural language query
    - it should batch emails for classification
    - it should return matching emails sorted by score (descending)
    - it should filter out emails below score threshold
    - it should return empty array for no matches
    - it should handle classifier errors gracefully
    - it should handle empty query (boundary)
    - it should handle query with only whitespace
    - it should report progress during batch processing
- [ ] T067 [P] [US3] Write test for SearchInput component in tests/unit/tui/SearchInput.test.tsx
  - Tests:
    - it should render text input field
    - it should capture user input
    - it should submit on Enter
    - it should not submit empty query (boundary)
    - it should cancel on Esc
    - it should show placeholder text
    - it should clear input on successful submit
    - it should show query history on ArrowUp

### Implementation for User Story 3

- [ ] T068 [US3] Define EmailClassifier interface in src/core/search/classifier.ts
  - Tests:
    - it should export EmailClassifier interface
    - it should define classify(query, emails) signature
- [ ] T069 [US3] Implement ClaudeClassifier in src/core/search/claude.ts
  - Tests:
    - it should implement EmailClassifier interface
    - it should construct with API key from config
- [ ] T070 [US3] Implement SearchEngine in src/core/search/engine.ts
  - Tests:
    - it should accept classifier as dependency
    - it should load emails from cache
- [ ] T071 [US3] Add batch processing (10-20 emails per request) in src/core/search/engine.ts
  - Tests:
    - it should batch 10 emails per request (boundary: exactly 10)
    - it should batch 20 emails max per request (boundary: exactly 20)
    - it should handle partial batch (boundary: less than 10)
    - it should process multiple batches sequentially
- [ ] T072 [US3] Create SearchInput component in src/tui/components/SearchInput.tsx
  - Tests:
    - it should render with focus
    - it should show "Search:" prefix
- [ ] T073 [US3] Add '/' key binding for search in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should show search input on '/'
    - it should not trigger when already in search mode
- [ ] T074 [US3] Integrate SearchEngine with TUI in src/tui/app.tsx
  - Tests:
    - it should show search input on '/'
    - it should display results after search
    - it should return to full list on Esc
- [ ] T075 [US3] Display "no matches" message in src/tui/components/EmailList.tsx
  - Tests:
    - it should show "no matches" when search returns empty
    - it should show query text in message
- [ ] T076 [US3] Add search loading indicator in src/tui/app.tsx
  - Tests:
    - it should show "Searching..." during classification
    - it should show progress (batch X of Y)

### Integration Tests for User Story 3

> **Write after implementation is complete** to verify full user flow

- [ ] T076a [US3] Integration test for NL search flow in tests/integration/nl-search.test.ts
  - Tests:
    - it should complete search flow from '/' to results displayed
    - it should classify emails via Claude API
    - it should display matching emails sorted by relevance
- [ ] T076b [US3] Integration test for search error handling in tests/integration/search-errors.test.ts
  - Tests:
    - it should display error message on API failure
    - it should allow retry after error
    - it should handle empty inbox search

**Checkpoint**: User Story 3 complete - natural language search works

---

## Phase 6: User Story 4 - Apply Actions to Emails (Priority: P2)

**Goal**: Select emails, apply labels, archive, or delete with confirmation

**Independent Test**: Select emails, apply each action type, verify changes persist in Gmail

### Models for User Story 4

- [ ] T077 [US4] Create Action type in src/core/models/index.ts
- [ ] T078 [US4] Create ConfirmationRequired class in src/core/errors.ts

### Tests for User Story 4

- [ ] T079 [P] [US4] Write test for ActionExecutor in tests/unit/actions/executor.test.ts
  - Tests:
    - it should execute label action on selected emails
    - it should execute archive action on selected emails
    - it should execute delete action on selected emails
    - it should throw ConfirmationRequired for destructive actions
    - it should proceed after confirmation callback returns true
    - it should abort after confirmation callback returns false
    - it should handle no emails selected (boundary: 0)
    - it should handle partial failure (some emails fail)
    - it should report which emails failed
    - it should rollback on complete failure
- [ ] T080 [P] [US4] Write test for GmailClient.modifyLabels in tests/unit/gmail/client.test.ts
  - Tests:
    - it should add label to email
    - it should remove label from email
    - it should add and remove labels in same call
    - it should handle batch of emails (boundary: 1, 50, 100)
    - it should throw GmailAPIError on failure
    - it should throw NotFoundError for non-existent label
    - it should handle email already having label (idempotent)
    - it should handle email missing label to remove (idempotent)
- [ ] T081 [P] [US4] Write test for selection state in tests/unit/tui/EmailList.test.tsx
  - Tests:
    - it should toggle selection on Space
    - it should select all on Ctrl+A
    - it should deselect all on Ctrl+A when all selected
    - it should show selection indicator (checkbox)
    - it should show selection count in status bar
    - it should track multiple selections
    - it should preserve selection across navigation
    - it should clear selection on action complete
    - it should handle selection with 0 emails (boundary)
- [ ] T082 [P] [US4] Write test for ConfirmDialog in tests/unit/tui/ConfirmDialog.test.tsx
  - Tests:
    - it should display action description
    - it should display affected email count
    - it should confirm on Enter or 'y'
    - it should cancel on Esc or 'n'
    - it should be keyboard accessible

### Implementation for User Story 4

- [ ] T083 [US4] Implement GmailClient.modifyLabels() in src/core/gmail/client.ts
  - Tests:
    - it should call Gmail API batchModify
    - it should chunk requests over 100 emails
- [ ] T084 [US4] Implement GmailClient.archive() in src/core/gmail/client.ts
  - Tests:
    - it should remove INBOX label from email
    - it should handle already-archived email
- [ ] T085 [US4] Implement GmailClient.trash() in src/core/gmail/client.ts
  - Tests:
    - it should move email to TRASH
    - it should handle already-trashed email
- [ ] T086 [US4] Implement ActionExecutor in src/core/actions/executor.ts
  - Tests:
    - it should accept GmailClient as dependency
    - it should validate action type
- [ ] T087 [US4] Add confirmation callback to ActionExecutor in src/core/actions/executor.ts
  - Tests:
    - it should call confirmation callback before destructive action
    - it should skip confirmation for non-destructive actions (label)
- [ ] T088 [US4] Add selection state to EmailList in src/tui/components/EmailList.tsx
  - Tests:
    - it should render checkbox column
    - it should style selected rows differently
- [ ] T089 [US4] Add Space key for toggle selection in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should toggle current email selection on Space
    - it should work with keyboard navigation
- [ ] T090 [US4] Add Ctrl+A for select all in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should select all visible emails
    - it should work with filtered list
- [ ] T091 [US4] Create ConfirmDialog component in src/tui/components/ConfirmDialog.tsx
  - Tests:
    - it should render as modal overlay
    - it should focus confirm button by default
- [ ] T092 [US4] Create LabelPicker component in src/tui/components/LabelPicker.tsx
  - Tests:
    - it should display available labels
    - it should filter labels as user types (case-insensitive)
    - it should highlight matching substring
    - it should select label on Enter
    - it should close on Esc
    - it should show "no labels" state when account has none
    - it should navigate labels with j/k
    - it should show nested labels with indentation
- [ ] T093 [US4] Add 'l' key for apply label in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should open LabelPicker on 'l' with selection
    - it should do nothing if no emails selected
- [ ] T094 [US4] Add 'a' key for archive in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should trigger archive action on 'a' with selection
    - it should do nothing if no emails selected
- [ ] T095 [US4] Add 'd' key for delete in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should trigger delete action on 'd' with selection
    - it should do nothing if no emails selected
- [ ] T096 [US4] Create ActionBar component with shortcuts display in src/tui/components/ActionBar.tsx
  - Tests:
    - it should display keyboard shortcuts
    - it should show selection count when emails selected
    - it should update dynamically
- [ ] T097 [US4] Integrate ActionExecutor with TUI in src/tui/app.tsx
  - Tests:
    - it should wire action keys to ActionExecutor
    - it should show confirmation dialog for destructive actions
    - it should execute action on confirm
    - it should show error message on action failure
    - it should show success message on action complete
    - it should disable action keys during action execution
- [ ] T098 [US4] Refresh email list after actions in src/tui/app.tsx
  - Tests:
    - it should remove archived emails from list
    - it should remove deleted emails from list
    - it should update email labels in list

### Integration Tests for User Story 4

> **Write after implementation is complete** to verify full user flow

- [ ] T098a [US4] Integration test for label action flow in tests/integration/apply-label.test.ts
  - Tests:
    - it should select emails, press 'l', pick label, confirm
    - it should update emails in Gmail API
    - it should refresh list showing new labels
- [ ] T098b [US4] Integration test for archive flow in tests/integration/archive-emails.test.ts
  - Tests:
    - it should select emails, press 'a', confirm
    - it should remove INBOX label via Gmail API
    - it should remove emails from inbox view
- [ ] T098c [US4] Integration test for delete flow in tests/integration/delete-emails.test.ts
  - Tests:
    - it should select emails, press 'd', show confirmation
    - it should trash emails via Gmail API on confirm
    - it should cancel on 'n' and keep emails

**Checkpoint**: User Story 4 complete - all email actions work

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, help, and refinements

- [ ] T099 [P] Add error boundary to TUI in src/tui/app.tsx
  - Tests:
    - it should catch component errors
    - it should display user-friendly error message
    - it should offer retry option
- [ ] T100 [P] Create HelpScreen component in src/tui/components/HelpScreen.tsx
  - Tests:
    - it should display all keyboard shortcuts
    - it should group shortcuts by category
    - it should close on any key press
- [ ] T101 Add '?' key for help screen in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should show HelpScreen on '?'
    - it should not trigger when input focused
- [ ] T102 Add 'q' key for quit in src/tui/hooks/useKeyboard.ts
  - Tests:
    - it should exit app on 'q'
    - it should confirm if unsaved changes exist
- [ ] T103 [P] Add rate limit error UI feedback in src/tui/app.tsx
  - Tests:
    - it should display rate limit message
    - it should show retry countdown
    - it should auto-retry after delay
- [ ] T104 [P] Add re-authentication prompt on token expiry in src/tui/app.tsx
  - Tests:
    - it should detect token expiry error
    - it should prompt for re-authentication
    - it should resume after successful re-auth
- [ ] T105 Run full integration test with real Gmail account
  - Tests:
    - it should complete full workflow: view → search → select → action
    - it should handle real API responses
    - it should persist changes to Gmail
- [ ] T106 Verify all keyboard shortcuts documented in HelpScreen
  - Tests:
    - it should list j/k navigation
    - it should list s/f sort/filter
    - it should list / search
    - it should list l/a/d actions
    - it should list ? help and q quit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 can start immediately after Foundational
  - US2 can start after US1 (extends EmailCache and adds UI)
  - US3 can start after US1 (needs TUI shell, adds search)
  - US4 can start after US1 (needs TUI shell, adds actions)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
       │
       ▼
    US1 (P1) ──────────────────┐
       │                       │
       ├───► US2 (P1)          │
       │                       │
       ├───► US3 (P1)          │
       │                       │
       └───► US4 (P2) ─────────┤
                               │
                               ▼
                         Polish (Phase 7)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/interfaces before services
- Services before TUI components
- Core implementation before UI integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All model/interface tasks (T007-T011) can run in parallel
- All error class tasks (T013-T016) can run in parallel
- Tests for a user story marked [P] can run in parallel
- US2, US3, US4 can run in parallel after US1 completes (if team capacity allows)

---

## Parallel Example: User Story 3

```bash
# First create models needed by US3:
T062 → T063

# Launch all tests for User Story 3 together:
T064 [P] [US3] Write test for EmailClassifier interface
T065 [P] [US3] Write test for ClaudeClassifier
T066 [P] [US3] Write test for SearchEngine
T067 [P] [US3] Write test for SearchInput component

# Then implementation sequentially:
T068 → T069 → T070 → T071 → T072 → T073 → T074 → T075 → T076
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test inbox viewing and navigation
5. Deploy/demo if ready - this is a working MVP!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **MVP: View inbox**
3. Add User Story 2 → Test independently → **Sort/filter emails**
4. Add User Story 3 → Test independently → **NL search (magic feature)**
5. Add User Story 4 → Test independently → **Full workflow complete**
6. Polish → Production-ready TUI

### Parallel Team Strategy

With multiple developers after Foundational:
- Developer A: User Story 1 → User Story 2
- Developer B: User Story 3 (after US1 TUI shell exists)
- Developer C: User Story 4 (after US1 TUI shell exists)

---

## Summary

| Phase | Tasks | Integration Tests | Unit Test Cases |
|-------|-------|-------------------|-----------------|
| Setup | 6 | 0 | 0 |
| Foundational | 32 | 2 | ~65 |
| US1: View Inbox | 16 | 2 | ~50 |
| US2: Filter/Sort | 12 | 1 | ~35 |
| US3: NL Search | 17 | 2 | ~50 |
| US4: Actions | 25 | 3 | ~75 |
| Polish | 8 | 0 | ~20 |
| **Total** | **116** | **10** | **~295** |

**MVP Scope**: User Story 1 (16 tasks after Foundational)

**Full TUI MVP**: User Stories 1-4 (70 tasks after Foundational)

**JIT Principle Applied**: Models and error classes are created in the user story that first needs them, not upfront.

**Test Coverage**: Each task includes specific "it should..." test cases. Integration tests verify cross-component flows at story boundaries.
