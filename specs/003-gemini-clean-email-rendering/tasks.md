# Tasks: Clean Email Rendering

**Input**: Design documents from `/specs/003-gemini-clean-email-rendering/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY. Follow Strict TDD: Write tests FIRST, ensure they FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Install `open` and `clipboardy` npm packages
- [x] T002 Create `src/utils/emailRenderer.ts` structure and export `IEmailRenderer` interface
- [x] T003 Create `tests/unit/utils/emailRenderer.test.ts` structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `RenderedLink` and `ParsedEmailBody` types in `src/utils/emailRenderer.ts` using `contracts/rendering.ts` as the source

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Collapse Excessive Blank Lines (Priority: P1) 🎯 MVP

**Goal**: Readability improvement by collapsing 3+ consecutive blank lines to exactly 2.

**Independent Test**: Can be fully tested by opening an email with 3, 5, or 10 consecutive blank lines and verifying that the rendered output only shows exactly 2 blank lines in those spots.

### Tests for User Story 1 (MANDATORY - Strict TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 [P] [US1] Unit tests for collapsing blank lines in `tests/unit/utils/emailRenderer.test.ts`

### Implementation for User Story 1

- [x] T006 [US1] Implement blank line collapsing regex/logic in `src/utils/emailRenderer.ts` (returns `ParsedEmailBody`)
- [x] T007 [US1] Integrate `emailRenderer.parse` into `src/components/Inbox/EmailDetail.tsx` to display `ParsedEmailBody.content`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Shorten Long URLs (Priority: P1)

**Goal**: Ensure no URL or link text exceeds 50% of the detail pane width.

**Independent Test**: Can be fully tested by opening an email with a URL longer than the detail window width and verifying it is replaced by shorter text and does not exceed half the window width.

### Tests for User Story 2 (MANDATORY - Strict TDD) ⚠️

- [x] T008 [P] [US2] Unit tests for URL extraction and truncation in `tests/unit/utils/emailRenderer.test.ts`
- [x] T009 [P] [US2] Integration test for parsing and rendering updated body in `tests/integration/email-rendering.test.tsx`

### Implementation for User Story 2

- [x] T010 [US2] Implement URL extraction and end truncation logic in `src/utils/emailRenderer.ts`
- [x] T011 [US2] Update `src/components/Inbox/EmailDetail.tsx` to handle the updated `ParsedEmailBody` (visual changes only)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Interactive Links (Priority: P2)

**Goal**: Allow users to focus, open, and copy shortened URLs.

**Independent Test**: Can be tested by scrolling until a link is at the top of the pane and verifying it is focused (Cyan highlight), or using `Tab` to select a link, then triggering the "Open" (Enter) or "Copy" (c) action.

### Tests for User Story 3 (MANDATORY - Strict TDD) ⚠️

- [x] T012 [P] [US3] Unit tests for focus tracking and `Tab` cycling in `tests/unit/emailDetail.test.tsx`
- [x] T013 [P] [US3] Unit tests for `open` and `clipboardy` actions in `tests/unit/emailDetail.test.tsx`
- [x] T014 [US3] Integration test for full link interaction flow in `tests/integration/link-interaction.test.tsx`

### Implementation for User Story 3

- [x] T015 [US3] Implement `LinkManager` hook or state in `src/components/Inbox/EmailDetail.tsx`
- [x] T016 [US3] Implement "Focus Follows Scroll" calculation in `src/components/Inbox/EmailDetail.tsx`
- [x] T017 [US3] Wire `Tab`, `Enter`, and `c` keys in `src/components/Inbox/EmailDetail.tsx` via `useInput`
- [x] T018 [US3] Implement Cyan highlight for the currently focused link in `src/components/Inbox/EmailDetail.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T019 Run quickstart.md validation
- [x] T020 Code cleanup and refactoring in `EmailDetail.tsx`
- [x] T021 Measure and validate email rendering performance (target: SC-005 < 200ms per email)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after US1 - Builds upon the parser utility
- **User Story 3 (P2)**: Can start after US2 - Requires links to be extracted before they can be interactive

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- All tests for a user story marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
