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

- [ ] T001 Initialize Node.js project with package.json per plan.md in /
- [ ] T002 Configure TypeScript with tsconfig.json in /
- [ ] T003 [P] Configure Vitest with vitest.config.ts in /
- [ ] T004 [P] Configure ESLint and Prettier in /
- [ ] T005 Create directory structure: src/core/, src/tui/, src/cli/, tests/ per plan.md
- [ ] T006 [P] Add .gitignore for node_modules, dist, .env, *.db

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Models

- [ ] T007 [P] Create Email interface in src/core/models/index.ts per data-model.md
- [ ] T008 [P] Create EmailAddress interface in src/core/models/index.ts
- [ ] T009 [P] Create Label and LabelType types in src/core/models/index.ts
- [ ] T010 [P] Create Category type in src/core/models/index.ts
- [ ] T011 [P] Create Config interface in src/core/models/index.ts
- [ ] T012 Create core library barrel export in src/core/index.ts

### Error Classes

- [ ] T013 [P] Create GmailSweepError base class in src/core/errors.ts
- [ ] T014 [P] Create AuthenticationError class in src/core/errors.ts
- [ ] T015 [P] Create GmailAPIError and RateLimitError classes in src/core/errors.ts
- [ ] T016 [P] Create NotFoundError class in src/core/errors.ts

### Gmail Authentication

- [ ] T017 Write unit test for OAuth2 auth flow in tests/unit/gmail/auth.test.ts
- [ ] T018 Implement OAuth2 authentication in src/core/gmail/auth.ts using googleapis
- [ ] T019 Write unit test for token refresh in tests/unit/gmail/auth.test.ts
- [ ] T020 Implement token persistence in src/core/gmail/auth.ts (~/.config/gmail-sweep/token.json)

### Gmail Client (List Messages)

- [ ] T021 Write unit test for listMessages in tests/unit/gmail/client.test.ts
- [ ] T022 Implement GmailClient constructor in src/core/gmail/client.ts
- [ ] T023 Implement GmailClient.authenticate() in src/core/gmail/client.ts
- [ ] T024 Implement GmailClient.listMessages() with pagination in src/core/gmail/client.ts
- [ ] T025 Implement retry with exponential backoff using p-retry in src/core/gmail/client.ts

### Email Cache

- [ ] T026 Write unit test for EmailCache in tests/unit/cache/db.test.ts
- [ ] T027 Implement EmailCache constructor and initialize() in src/core/cache/db.ts
- [ ] T028 Implement EmailCache.upsertEmails() in src/core/cache/db.ts
- [ ] T029 Implement EmailCache.getEmails() with sorting in src/core/cache/db.ts
- [ ] T030 Implement EmailCache.getLastSync() and setLastSync() in src/core/cache/db.ts

### Config Loading

- [ ] T031 Write unit test for config loading in tests/unit/config.test.ts
- [ ] T032 Implement loadConfig() in src/core/config.ts
- [ ] T033 Implement default config creation in src/core/config.ts

### CLI Entry Point

- [ ] T034 Implement CLI argument parsing with commander in src/cli/index.ts
- [ ] T035 Implement Gmail account argument handling in src/cli/index.ts
- [ ] T036 Wire CLI to TUI app launch in src/cli/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View and Browse Inbox (Priority: P1) 🎯 MVP

**Goal**: Display inbox emails in a list with keyboard navigation and preview pane

**Independent Test**: Connect Gmail account, verify inbox loads with proper sorting, bold unread, and j/k navigation works

### Tests for User Story 1

- [ ] T037 [P] [US1] Write test for EmailList component rendering in tests/unit/tui/EmailList.test.tsx
- [ ] T038 [P] [US1] Write test for EmailPreview component in tests/unit/tui/EmailPreview.test.tsx
- [ ] T039 [P] [US1] Write test for useKeyboard hook in tests/unit/tui/useKeyboard.test.ts
- [ ] T040 [P] [US1] Write test for useGmail hook in tests/unit/tui/useGmail.test.ts

### Implementation for User Story 1

- [ ] T041 [US1] Create TUI app shell in src/tui/app.tsx using Ink
- [ ] T042 [US1] Implement useKeyboard hook (j/k, arrows, Enter) in src/tui/hooks/useKeyboard.ts
- [ ] T043 [US1] Implement useGmail hook for data fetching in src/tui/hooks/useGmail.ts
- [ ] T044 [US1] Implement EmailList component with scrolling in src/tui/components/EmailList.tsx
- [ ] T045 [US1] Add bold styling for unread emails in src/tui/components/EmailList.tsx
- [ ] T046 [US1] Implement GmailClient.getMessage() for full email in src/core/gmail/client.ts
- [ ] T047 [US1] Implement EmailPreview component in src/tui/components/EmailPreview.tsx
- [ ] T048 [US1] Implement split-pane layout (list + preview) in src/tui/app.tsx
- [ ] T049 [US1] Create TUI entry point in src/tui/index.tsx
- [ ] T050 [US1] Add loading state indicator in src/tui/app.tsx

**Checkpoint**: User Story 1 complete - inbox viewing and browsing works

---

## Phase 4: User Story 2 - Filter and Sort Emails (Priority: P1)

**Goal**: Sort by sender/date/label/category, filter by label/category/sender

**Independent Test**: Apply different sort orders and filters, verify list updates correctly

### Tests for User Story 2

- [ ] T051 [P] [US2] Write test for EmailCache sorting in tests/unit/cache/db.test.ts
- [ ] T052 [P] [US2] Write test for EmailCache filtering in tests/unit/cache/db.test.ts
- [ ] T053 [P] [US2] Write test for sort/filter UI in tests/unit/tui/SortFilterMenu.test.tsx

### Implementation for User Story 2

- [ ] T054 [US2] Implement GmailClient.listLabels() in src/core/gmail/client.ts
- [ ] T055 [US2] Extend EmailCache.getEmails() with labelFilter in src/core/cache/db.ts
- [ ] T056 [US2] Extend EmailCache.getEmails() with categoryFilter in src/core/cache/db.ts
- [ ] T057 [US2] Create SortFilterMenu component in src/tui/components/SortFilterMenu.tsx
- [ ] T058 [US2] Add 's' key binding for sort menu in src/tui/hooks/useKeyboard.ts
- [ ] T059 [US2] Add 'f' key binding for filter menu in src/tui/hooks/useKeyboard.ts
- [ ] T060 [US2] Integrate sort/filter with EmailList in src/tui/app.tsx
- [ ] T061 [US2] Add Esc key to clear filters in src/tui/hooks/useKeyboard.ts

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
- [ ] T065 [P] [US3] Write test for ClaudeClassifier in tests/unit/search/claude.test.ts
- [ ] T066 [P] [US3] Write test for SearchEngine in tests/unit/search/engine.test.ts
- [ ] T067 [P] [US3] Write test for SearchInput component in tests/unit/tui/SearchInput.test.tsx

### Implementation for User Story 3

- [ ] T068 [US3] Define EmailClassifier interface in src/core/search/classifier.ts
- [ ] T069 [US3] Implement ClaudeClassifier in src/core/search/claude.ts
- [ ] T070 [US3] Implement SearchEngine in src/core/search/engine.ts
- [ ] T071 [US3] Add batch processing (10-20 emails per request) in src/core/search/engine.ts
- [ ] T072 [US3] Create SearchInput component in src/tui/components/SearchInput.tsx
- [ ] T073 [US3] Add '/' key binding for search in src/tui/hooks/useKeyboard.ts
- [ ] T074 [US3] Integrate SearchEngine with TUI in src/tui/app.tsx
- [ ] T075 [US3] Display "no matches" message in src/tui/components/EmailList.tsx
- [ ] T076 [US3] Add search loading indicator in src/tui/app.tsx

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
- [ ] T080 [P] [US4] Write test for GmailClient.modifyLabels in tests/unit/gmail/client.test.ts
- [ ] T081 [P] [US4] Write test for selection state in tests/unit/tui/EmailList.test.tsx
- [ ] T082 [P] [US4] Write test for ConfirmDialog in tests/unit/tui/ConfirmDialog.test.tsx

### Implementation for User Story 4

- [ ] T083 [US4] Implement GmailClient.modifyLabels() in src/core/gmail/client.ts
- [ ] T084 [US4] Implement GmailClient.archive() in src/core/gmail/client.ts
- [ ] T085 [US4] Implement GmailClient.trash() in src/core/gmail/client.ts
- [ ] T086 [US4] Implement ActionExecutor in src/core/actions/executor.ts
- [ ] T087 [US4] Add confirmation callback to ActionExecutor in src/core/actions/executor.ts
- [ ] T088 [US4] Add selection state to EmailList in src/tui/components/EmailList.tsx
- [ ] T089 [US4] Add Space key for toggle selection in src/tui/hooks/useKeyboard.ts
- [ ] T090 [US4] Add Ctrl+A for select all in src/tui/hooks/useKeyboard.ts
- [ ] T091 [US4] Create ConfirmDialog component in src/tui/components/ConfirmDialog.tsx
- [ ] T092 [US4] Create LabelPicker component in src/tui/components/LabelPicker.tsx
- [ ] T093 [US4] Add 'l' key for apply label in src/tui/hooks/useKeyboard.ts
- [ ] T094 [US4] Add 'a' key for archive in src/tui/hooks/useKeyboard.ts
- [ ] T095 [US4] Add 'd' key for delete in src/tui/hooks/useKeyboard.ts
- [ ] T096 [US4] Create ActionBar component with shortcuts display in src/tui/components/ActionBar.tsx
- [ ] T097 [US4] Integrate ActionExecutor with TUI in src/tui/app.tsx
- [ ] T098 [US4] Refresh email list after actions in src/tui/app.tsx

**Checkpoint**: User Story 4 complete - all email actions work

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, help, and refinements

- [ ] T099 [P] Add error boundary to TUI in src/tui/app.tsx
- [ ] T100 [P] Create HelpScreen component in src/tui/components/HelpScreen.tsx
- [ ] T101 Add '?' key for help screen in src/tui/hooks/useKeyboard.ts
- [ ] T102 Add 'q' key for quit in src/tui/hooks/useKeyboard.ts
- [ ] T103 [P] Add rate limit error UI feedback in src/tui/app.tsx
- [ ] T104 [P] Add re-authentication prompt on token expiry in src/tui/app.tsx
- [ ] T105 Run full integration test with real Gmail account
- [ ] T106 Verify all keyboard shortcuts documented in HelpScreen

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

| Phase | Tasks | Parallel Tasks |
|-------|-------|----------------|
| Setup | 6 | 3 |
| Foundational | 30 | 14 |
| US1: View Inbox | 14 | 4 |
| US2: Filter/Sort | 11 | 3 |
| US3: NL Search | 15 | 4 |
| US4: Actions | 22 | 4 |
| Polish | 8 | 4 |
| **Total** | **106** | **36** |

**MVP Scope**: User Story 1 (14 tasks after Foundational)

**Full TUI MVP**: User Stories 1-4 (62 tasks after Foundational)

**JIT Principle Applied**: Models and error classes are created in the user story that first needs them, not upfront.
