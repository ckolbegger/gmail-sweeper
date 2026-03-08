# Tasks: Email Action Keys

**Input**: Design documents from `/specs/004-glm-email-action-keys/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: TDD is required per Constitution. Each task includes writing failing tests with stub implementation, then implementing until tests pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- This feature modifies existing files: `src/cli/app.tsx`, `src/cli/help.ts`

---

## Phase 1: Setup

**Purpose**: No new project structure needed - modifying existing files

- [X] T001 Verify existing GmailClient methods work: `archiveEmails()` and `deleteEmails()` in `src/core/services/gmail-client.ts`
- [X] T002 Review existing keyboard shortcut pattern in `src/cli/hooks/use-keyboard.ts` and `src/cli/app.tsx`

---

## Phase 2: Foundational

**Purpose**: No foundational work needed - using existing infrastructure

_This feature reuses existing GmailClient, useKeyboard hook, and React state management. No blocking prerequisites._

**Checkpoint**: Ready for user story implementation

---

## Phase 3: User Story 1 - Archive Email with 'e' Key (Priority: P1) 🎯 MVP

**Goal**: Users can archive the selected email by pressing 'e', removing it from the list and auto-advancing selection.

**Independent Test**: Select an email, press 'e', verify email is archived via Gmail API and removed from displayed list.

### TDD Implementation for User Story 1

- [X] T003 [US1] Write failing test for archive action handler, then implement `handleArchiveEmail` callback in `src/cli/app.tsx` until test passes
  - Test: calls `gmailClient.archiveEmails([emailId])` with selected email ID
  - Test: removes email from `emails` state on success
  - Test: shows success message "Archived 1 email"
  - Test: shows error message on API failure
  - Test: does nothing when no email selected
  - Stub: return early, then implement API call and state update

- [X] T004 [US1] Write failing test for 'e' keyboard shortcut, then register shortcut in `src/cli/app.tsx` until test passes
  - Test: 'e' key triggers `handleArchiveEmail` when email selected
  - Test: 'e' key ignored when `filterMode` is active
  - Test: 'e' key ignored when `showHelp` is active
  - Test: 'e' key ignored when `isRefreshing` is true
  - Test: 'e' key ignored when no email selected
  - Stub: add shortcut that returns false, then implement guard conditions

- [X] T005 [US1] Write failing test for help panel entry, then add documentation in `src/cli/help.ts` until test passes
  - Test: help panel contains 'e' → 'Archive selected email'
  - Stub: empty commands array, then add action section

- [X] T006 [US1] Write failing test for footer display, then update footer in `src/cli/app.tsx` until test passes
  - Test: footer shows 'e Archive' in shortcut list
  - Stub: missing from footer, then add to dim text

**Checkpoint**: User Story 1 complete - 'e' key archives email, removes from list, shows status

---

## Phase 4: User Story 2 - Delete Email with '#' Key (Priority: P1)

**Goal**: Users can delete the selected email by pressing '#', moving it to trash and removing from list.

**Independent Test**: Select an email, press '#', verify email is moved to trash via Gmail API and removed from displayed list.

### TDD Implementation for User Story 2

- [X] T007 [US2] Write failing test for delete action handler, then implement `handleDeleteEmail` callback in `src/cli/app.tsx` until test passes
  - Test: calls `gmailClient.deleteEmails([emailId])` with selected email ID
  - Test: removes email from `emails` state on success
  - Test: shows success message "Deleted 1 email"
  - Test: shows error message on API failure
  - Test: does nothing when no email selected
  - Stub: return early, then implement API call and state update

- [X] T008 [US2] Write failing test for '#' keyboard shortcut, then register shortcut in `src/cli/app.tsx` until test passes
  - Test: '#' key triggers `handleDeleteEmail` when email selected
  - Test: '#' key ignored when `filterMode` is active
  - Test: '#' key ignored when `showHelp` is active
  - Test: '#' key ignored when `isRefreshing` is true
  - Test: '#' key ignored when no email selected
  - Stub: add shortcut that returns false, then implement guard conditions

- [X] T009 [US2] Write failing test for help panel entry, then add documentation in `src/cli/help.ts` until test passes
  - Test: help panel contains '#' → 'Delete selected email (move to trash)'
  - Stub: missing from commands, then add to action section

- [X] T010 [US2] Write failing test for footer display, then update footer in `src/cli/app.tsx` until test passes
  - Test: footer shows '# Delete' in shortcut list
  - Stub: missing from footer, then add to dim text

**Checkpoint**: User Story 2 complete - '#' key deletes email, removes from list, shows status

---

## Phase 5: User Story 3 - Selection Navigation After Action (Priority: P2)

**Goal**: After archive/delete, selection automatically moves to the next logical email.

**Independent Test**: Perform archive/delete on first, middle, last, and only email; verify selection moves correctly.

### TDD Implementation for User Story 3

- [X] T011 [US3] Write failing test for selection auto-advance, then implement selection logic in `src/cli/app.tsx` until test passes
  - Test: middle email selected → after action, next email selected
  - Test: last email selected → after action, previous email selected
  - Test: only email selected → after action, no selection (undefined)
  - Test: first email selected → after action, new first email selected
  - Stub: no selection update, then implement index-based selection

**Checkpoint**: User Story 3 complete - selection auto-advances after actions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [X] T012 Run full test suite: `npm test` - verify all tests pass
- [X] T013 Run linting: `npm run lint` - verify no errors
- [X] T014 Run type checking: `npm run typecheck` - verify no errors
- [X] T015 Manual verification: Run app and test 'e' and '#' keys in both list and detail views

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verify existing code
- **Foundational (Phase 2)**: None needed - proceed to user stories
- **User Stories (Phase 3-5)**: Can proceed after Setup verification
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - can start immediately
- **User Story 2 (P1)**: No dependencies - can run in parallel with US1
- **User Story 3 (P2)**: Depends on US1 and US2 handlers being implemented

### Within Each User Story

- Write failing tests with stub implementation first
- Implement until all tests pass
- Verify checkpoint before moving to next story

### Parallel Opportunities

- T003-T006 (US1) can run in parallel with T007-T010 (US2) - different shortcuts, same pattern
- Tests within each task are written first, then implementation

---

## Parallel Example: User Stories 1 & 2

```bash
# These can run in parallel since they modify different handlers/shortcuts:
Task T003: "Write failing test for archive handler, implement in src/cli/app.tsx"
Task T007: "Write failing test for delete handler, implement in src/cli/app.tsx"

# After handlers done, shortcuts can also run in parallel:
Task T004: "Write failing test for 'e' shortcut, implement in src/cli/app.tsx"
Task T008: "Write failing test for '#' shortcut, implement in src/cli/app.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 3: User Story 1 (Archive)
3. **STOP and VALIDATE**: Test 'e' key works independently
4. Can ship with just archive functionality

### Incremental Delivery

1. Setup verification → Foundation confirmed
2. Add User Story 1 → Test 'e' key → Working archive (MVP!)
3. Add User Story 2 → Test '#' key → Working delete
4. Add User Story 3 → Test selection → Complete UX
5. Polish → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each task follows TDD: write failing test + stub, implement until passing
- GmailClient methods already exist - just need to call them
- No new dependencies required
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
