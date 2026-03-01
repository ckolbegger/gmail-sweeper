# Tasks: Email Action Keys

**Feature**: 004-minimax-email-action-keys | **Date**: 2026-03-01
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Implementation Strategy

**TDD Approach**: Each task specifies writing tests first that fail against a stub implementation, then updating the implementation until tests pass.

**MVP Scope**: User Story 1 (Archive with 'e' key) - P1 priority, core productivity feature
**Independent Delivery**: Each user story can be delivered independently once foundational tasks complete

---

## Phase 1: Foundational

Tasks that must complete before any user story implementation begins.

- [x] T001 Add ActionResult and EmailActionState types to src/core/models/index.ts (TDD: write tests first to define expected types, fail until types added)
- [x] T002 [P] Create stub useEmailActions hook in src/tui/hooks/useEmailActions.ts (export empty functions for testing)

---

## Phase 2: User Story 1 - Archive Email with 'e' Key (P1)

**Goal**: Users can press 'e' to archive the selected email and remove it from the list

**Independent Test Criteria**: Select email in list, press 'e', verify email removed from displayed list

### Tasks

- [x] T003 [US1] Write unit tests for archiveEmail function in tests/unit/tui/useEmailActions.test.ts (tests fail until useEmailActions implements archiveEmail)
- [x] T004 [US1] Implement archiveEmail function in src/tui/hooks/useEmailActions.ts (tests pass)
- [x] T005 [US1] Write integration tests for archive action in tests/integration/email-actions.test.ts (verify Gmail API called, email removed from list)
- [x] T006 [US1] Modify useKeyboard hook in src/tui/hooks/useKeyboard.ts to add 'e' key handler (calls archiveEmail when pressed)
- [x] T007 [US1] Write tests for 'e' key handling in tests/unit/tui/useKeyboard.test.ts (verify 'e' triggers archive)
- [x] T008 [US1] Handle edge case: 'e' pressed with no email selected (no action, no error per spec)

---

## Phase 3: User Story 2 - Delete Email with '#' Key (P1)

**Goal**: Users can press '#' to delete (trash) the selected email

**Independent Test Criteria**: Select email in list, press '#', verify confirmation prompt appears

### Tasks

- [x] T009 [P] [US2] Write unit tests for deleteEmail function triggers confirmation in tests/unit/tui/useEmailActions.test.ts (tests fail until confirmation flow implemented)
- [x] T010 [P] [US2] Implement deleteEmail confirmation flow in src/tui/hooks/useEmailActions.ts (show confirmation state)
- [x] T011 [US2] Write tests for confirmDelete and cancelDelete functions in tests/unit/tui/useEmailActions.test.ts
- [x] T012 [US2] Implement confirmDelete function in src/tui/hooks/useEmailActions.ts (calls Gmail trash, removes from list)
- [x] T013 [US2] Implement cancelDelete function in src/tui/hooks/useEmailActions.ts (clears confirmation state)
- [x] T014 [US2] Modify useKeyboard hook to add '#' key handler in src/tui/hooks/useKeyboard.ts (triggers delete confirmation)
- [x] T015 [US2] Write tests for '#' key handling in tests/unit/tui/useKeyboard.test.ts

---

## Phase 4: User Story 3 - Confirmation for Destructive Actions (P2)

**Goal**: Users confirm before delete, can cancel with 'n' or Escape

**Independent Test Criteria**: Press '#', confirmation appears, press 'y' confirms, press 'n' cancels

### Tasks

- [x] T016 [US3] Create ConfirmationPrompt component in src/tui/components/ConfirmationPrompt.tsx (TDD: write tests first)
- [ ] T017 [US3] Write tests for ConfirmationPrompt in tests/unit/tui/ConfirmationPrompt.test.tsx
- [ ] T018 [US3] Integrate ConfirmationPrompt into app.tsx with useEmailActions state
- [x] T019 [US3] Handle 'y', 'n', and Escape keys in confirmation state (per spec acceptance scenarios)

---

## Phase 5: Cross-Cutting Concerns

Tasks that affect multiple user stories or improve the overall feature

- [x] T020 [P] Handle archive/delete failures gracefully (FR-006: user-friendly error messages)
- [x] T021 [P] Handle "no email selected" edge case for '#' key (same as 'e')
- [x] T022 Implement automatic selection of next email after archive/delete (FR-007)
- [x] T023 Run full integration test: archive 5 emails, delete 2 emails, verify list updates correctly

---

## Bug Fixes

- [x] B001 [BUG] Emails not removed from list after archive/delete - onEmailRemoved callback is empty, need to update local email state (TDD: write test that fails when callback is empty, then fix implementation)
- [x] B002 [BUG] Emails reappear after restart - Fixed. Now calls refresh() after successful archive/delete to refetch emails from Gmail (bypassing stale cache).

---

## Dependencies Graph

```
Phase 1 (Foundational)
    │
    ├── T001 ──► T003 ──► T004 ──► T005 ──► T006 ──► T007 ──► T008
    │                                                      (US1)
    │
    └── T002 ──► T009 ──► T010 ──► T011 ──► T012 ──► T013 ──► T014 ──► T015
                   │                                            (US2)
                   │                                                  │
                   └──────────────────────────────────────────────────┘
                                        │
                                       T016 ──► T017 ──► T018 ──► T019
                                        │                     (US3)
                                        │
        T020 ◄──────────────────────────┘
        T021 ◄────────┐
                       │
        T022 ◄────────┼────────► T023
        (Phase 5)
```

---

## Parallel Execution Opportunities

| Tasks      | Reason                                                              |
| ---------- | ------------------------------------------------------------------- |
| T001, T002 | Independent - types and stub hook can be created in parallel        |
| T003, T009 | Both test useEmailActions - but T009 depends on T002 stub existing  |
| T016, T020 | T016 is component, T020 is error handling - can be done in parallel |

---

## Summary

- **Total Tasks**: 23
- **User Story 1 (Archive)**: 6 tasks
- **User Story 2 (Delete)**: 7 tasks
- **User Story 3 (Confirmation)**: 4 tasks
- **Cross-Cutting**: 4 tasks
- **Parallelizable**: 6 tasks marked [P]

---

## Files to Modify/Create

| File                                         | Change                                   |
| -------------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| `src/core/models/index.ts`                   | Add ActionResult, EmailActionState types |
| `src/tui/hooks/useEmailActions.ts`           | NEW - archive/delete logic               |
| `src/tui/hooks/useKeyboard.ts`               | MODIFY - add 'e' and                     | `src/tui/components/Confirmation '#' handlers |
| Prompt.tsx`                                  | NEW - y/n prompt                         |
| `src/tui/app.tsx`                            | MODIFY - integrate actions               |
| `tests/unit/tui/useEmailActions.test.ts`     | NEW                                      |
| `tests/unit/tui/useKeyboard.test.ts`         | MODIFY                                   |
| `tests/unit/tui/ConfirmationPrompt.test.tsx` | NEW                                      |
| `tests/integration/email-actions.test.ts`    | NEW                                      |
