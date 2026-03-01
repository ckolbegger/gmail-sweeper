# Tasks: Email Detail Rendering Improvements

**Input**: Design documents from `/specs/003-email-detail-rendering/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/interfaces.md

**TDD Approach**: Each implementation task begins with writing a failing test.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Source: `src/core/services/`, `src/cli/components/`
- Tests: `tests/unit/core/`, `tests/unit/cli/`, `tests/integration/`

---

## Phase 1: Setup

**Purpose**: Add required dependency for clipboard support

- [ ] T001 Add clipboardy dependency to package.json

---

## Phase 2: Foundational (Shared Types)

**Purpose**: Create shared types that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Write failing tests for URLReference and ProcessedBody interfaces in tests/unit/core/email-content-processor.test.ts
- [ ] T003 [P] Implement URLReference and ProcessedBody type exports in src/core/services/email-content-processor.ts

**Checkpoint**: Types ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Collapsed Blank Lines (Priority: P1) 🎯 MVP

**Goal**: Collapse sequences of 3+ blank lines to exactly 2 blank lines for better readability

**Independent Test**: Display an email with 5+ consecutive blank lines and verify only 2 blank lines appear

### Implementation for User Story 1

- [ ] T004 [US1] Write failing tests for collapseBlankLines function in tests/unit/core/email-content-processor.test.ts (cases: 5+ lines → 2, 2 lines → preserved, 0 lines → unchanged, multiple groups)
- [ ] T005 [US1] Implement collapseBlankLines function in src/core/services/email-content-processor.ts
- [ ] T006 [US1] Write failing test for buildBodyViewport integration with collapsed blank lines in tests/unit/cli/email-detail.test.ts
- [ ] T007 [US1] Integrate collapseBlankLines into buildBodyViewport in src/cli/components/email-detail.tsx
- [ ] T008 [US1] Write integration test for blank line collapsing in email detail pane in tests/integration/email-detail-blank-lines.test.ts

**Checkpoint**: Blank line collapsing works independently - MVP deliverable

---

## Phase 4: User Story 2 - Shortened URL Display (Priority: P1)

**Goal**: Truncate URLs to half pane width, display link text when available

**Independent Test**: Display email with 100+ char URL and verify it's truncated to half window width

### Implementation for User Story 2

- [ ] T009 [P] [US2] Write failing tests for URL detection regex in tests/unit/core/email-content-processor.test.ts (cases: http/https, www, no false positives on email addresses)
- [ ] T010 [P] [US2] Write failing tests for truncateUrl function in tests/unit/core/email-content-processor.test.ts (cases: short URL unchanged, long URL truncated with ellipsis, Unicode width handling using existing charDisplayWidth pattern)
- [ ] T011 [P] [US2] Write failing tests for detectUrls function in tests/unit/core/email-content-processor.test.ts (cases: single URL, multiple URLs, URLs with special chars, multiple URLs on same line)
- [ ] T012 [US2] Implement truncateUrl function in src/core/services/email-content-processor.ts (reuse display width calculation pattern from email-detail.tsx)
- [ ] T013 [US2] Implement detectUrls function in src/core/services/email-content-processor.ts
- [ ] T014 [US2] Write failing tests for process function in tests/unit/core/email-content-processor.test.ts (full integration: blank lines + URLs)
- [ ] T015 [US2] Implement process function in src/core/services/email-content-processor.ts (combines collapseBlankLines + detectUrls)
- [ ] T016 [US2] Write failing test for URL display truncation in EmailDetail in tests/unit/cli/email-detail-urls.test.ts
- [ ] T017 [US2] Integrate EmailContentProcessor into EmailDetail component in src/cli/components/email-detail.tsx (display truncated URLs, preserve full URLs for later use)
- [ ] T018 [US2] Add visual indicator for truncated URLs (ellipsis styling) in src/cli/components/email-detail.tsx
- [ ] T019 [US2] Write integration test for URL truncation in email detail pane in tests/integration/email-detail-url-display.test.ts

**Checkpoint**: URL truncation works independently - can be delivered with US1

---

## Phase 5: User Story 3 - URL Interaction (Priority: P2)

**Goal**: Keyboard shortcuts to cycle URLs, copy to clipboard, open in browser

**Independent Test**: Press URL cycling shortcut on email with URLs, verify URLs highlight in sequence with full URL in status line

### Implementation for User Story 3

- [ ] T020 [P] [US3] Write failing tests for clipboard service in tests/unit/core/clipboard-service.test.ts (include test for unavailability)
- [ ] T021 [P] [US3] Write failing tests for browser service in tests/unit/core/browser-service.test.ts (include test for open failure)
- [ ] T022 [US3] Implement ClipboardService with clipboardy in src/core/services/clipboard-service.ts
- [ ] T023 [US3] Implement BrowserService with open package in src/core/services/browser-service.ts
- [ ] T024 [US3] Write failing tests for URL cycling state (nextUrl, prevUrl, selectedIndex, wrap-around) in tests/unit/cli/email-detail-urls.test.ts
- [ ] T025 [US3] Add URLCyclingState to EmailDetail component in src/cli/components/email-detail.tsx (useState for selectedIndex, urls)
- [ ] T026 [US3] Write failing test for URL cycling keyboard shortcuts in tests/unit/cli/email-detail-urls.test.ts
- [ ] T027 [US3] Register URL cycling shortcuts (u, Shift+u) in EmailDetail using useKeyboard hook in src/cli/components/email-detail.tsx
- [ ] T028 [US3] Implement URL highlighting in body display in src/cli/components/email-detail.tsx
- [ ] T029 [US3] Add status line showing full URL when cycling in src/cli/components/email-detail.tsx
- [ ] T030 [US3] Register copy shortcut (c) and integrate ClipboardService in src/cli/components/email-detail.tsx
- [ ] T031 [US3] Register open shortcut (o) and integrate BrowserService in src/cli/components/email-detail.tsx
- [ ] T032 [US3] Handle "no URLs" edge case gracefully in src/cli/components/email-detail.tsx (status message)
- [ ] T033 [US3] Write integration test for URL cycling interaction in tests/integration/email-detail-url-cycling.test.ts

**Checkpoint**: All URL interaction features work - full feature complete

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge case coverage, documentation, final validation

- [ ] T034 [P] Write edge case tests for resize handling (SC-004) in tests/unit/cli/email-detail-urls.test.ts
- [ ] T035 [P] Write edge case tests for Unicode/special chars in URLs in tests/unit/core/email-content-processor.test.ts
- [ ] T036 Update help/keyboard shortcut documentation if applicable
- [ ] T037 Run full test suite and verify all tests pass
- [ ] T038 Run quickstart.md validation scenarios manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 - Uses same processor, should follow US1
- **User Story 3 (P2)**: Depends on US2 (needs URL detection) - Must follow US2

### Within Each User Story (TDD)

1. Write failing test FIRST
2. Implement minimum code to pass
3. Refactor if needed
4. Move to next task

### Parallel Opportunities

- T002, T003 can run in parallel (test/types for same feature)
- T009, T010, T011 can run in parallel (different test cases)
- T020, T021 can run in parallel (clipboard/browser tests)
- T022, T023 can run in parallel (clipboard/browser implementation)
- T034, T035 can run in parallel (different edge case tests)

---

## Parallel Example: User Story 2 Tests

```bash
# Launch all URL-related tests together:
Task: "Write failing tests for URL detection regex"
Task: "Write failing tests for truncateUrl function"
Task: "Write failing tests for detectUrls function"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (clipboardy)
2. Complete Phase 2: Foundational (types)
3. Complete Phase 3: User Story 1 (blank lines)
4. **STOP and VALIDATE**: Test blank line collapsing independently
5. Deploy/demo if ready - already valuable!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 → Test independently → Deploy (URLs readable!)
4. Add User Story 3 → Test independently → Deploy (Full feature!)
5. Each story adds value without breaking previous stories

---

## Summary

| Metric                     | Count                  |
| -------------------------- | ---------------------- |
| **Total Tasks**            | 38                     |
| **Setup Tasks**            | 1                      |
| **Foundational Tasks**     | 2                      |
| **User Story 1 Tasks**     | 5                      |
| **User Story 2 Tasks**     | 11                     |
| **User Story 3 Tasks**     | 14                     |
| **Polish Tasks**           | 5                      |
| **Integration Tests**      | 3 (one per user story) |
| **Parallel Opportunities** | 5 groups               |

---

## Test Coverage Map

| Test File                                            | User Story | Coverage                                                |
| ---------------------------------------------------- | ---------- | ------------------------------------------------------- |
| `tests/unit/core/email-content-processor.test.ts`    | US1, US2   | collapseBlankLines, URL detection, truncateUrl, process |
| `tests/unit/core/clipboard-service.test.ts`          | US3        | clipboard operations                                    |
| `tests/unit/core/browser-service.test.ts`            | US3        | browser open                                            |
| `tests/unit/cli/email-detail.test.ts`                | US1        | buildBodyViewport integration                           |
| `tests/unit/cli/email-detail-urls.test.ts`           | US2, US3   | URL display, cycling state, keyboard shortcuts          |
| `tests/integration/email-detail-blank-lines.test.ts` | US1        | E2E blank line collapsing                               |
| `tests/integration/email-detail-url-display.test.ts` | US2        | E2E URL truncation                                      |
| `tests/integration/email-detail-url-cycling.test.ts` | US3        | E2E URL interaction                                     |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD: Write failing test first, then implement
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
