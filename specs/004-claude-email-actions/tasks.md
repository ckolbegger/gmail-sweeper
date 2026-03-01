# Tasks: Email Action Keys — Archive & Delete

**Input**: Design documents from `/specs/004-claude-email-actions/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/hooks.md ✓

**Tests**: Tests are MANDATORY. Every task that adds behavior must write failing tests FIRST, then implement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no in-phase dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm no new dependencies or project initialization required.

- [ ] T001 Confirm no new npm packages are needed — `GmailClient.archive()` and `.trash()` already exist; document in `specs/004-claude-email-actions/quickstart.md`

**Checkpoint**: No blockers — proceed directly to foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add `removeEmail` and `restoreEmail` to `useGmail`. These are the shared optimistic-update primitives all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Write failing unit tests for `removeEmail` (removes by id, no-op on unknown id) and `restoreEmail` (re-inserts at original index, handles out-of-bounds gracefully) in `tests/unit/tui/useGmail.actions.test.ts`; then implement both on `UseGmailResult` in `src/tui/hooks/useGmail.ts`

**Checkpoint**: Foundation ready — `useGmail` tests pass; user story implementation can begin.

---

## Phase 3: User Story 1 — Archive Email from List View (Priority: P1) 🎯 MVP

**Goal**: Pressing `e` on the highlighted email archives it on the server and removes it from the displayed list immediately. Selection advances to the next email; a server failure reverts the removal and shows an error message.

**Independent Test**: Load the TUI with mocked emails, press `e`, verify the email is absent from the rendered list and `GmailClient.archive` was called with the correct ID.

- [ ] T003 [P] [US1] Write failing unit tests for `useEmailActions` archive: happy path (calls `onRemove` then `client.archive`), failure revert (calls `onRestore` + sets `actionError`), in-flight guard (second call ignored while first in flight), no-op when client is absent; then create `useEmailActions` hook implementing all these behaviors in `src/tui/hooks/useEmailActions.ts`
- [ ] T004 [P] [US1] Write failing unit tests for `useKeyboard` `e` key: dispatches `onArchive` with current email id when list is non-empty; is a no-op when list is empty; is a no-op when filter input is active; then add `onArchive?: (emailId: string) => void` option and `e` key handler to `useKeyboard` in `src/tui/hooks/useKeyboard.ts`
- [ ] T005 [US1] Write failing integration test — render `InboxApp` with mocked client and 3 emails, simulate `e` keypress, verify highlighted email absent from rendered output and `archive` spy called — in `tests/integration/email-actions.test.ts`; then wire `useEmailActions` into `InboxApp` (pass `removeEmail`/`restoreEmail` from `useGmail`, pass `onArchive` lambda to `useKeyboard`, render `actionError` as red `<Text>` in footer) in `src/tui/app.tsx`

**Checkpoint**: US1 complete — `e` removes email immediately; server failure reverts and shows error.

---

## Phase 4: User Story 2 — Delete Email from List View (Priority: P2)

**Goal**: Pressing `#` on the highlighted email moves it to Trash on the server and removes it from the displayed list immediately.

**Independent Test**: Load the TUI with mocked emails, press `#`, verify the email is absent from the rendered list and `GmailClient.trash` was called with the correct ID.

- [ ] T006 [P] [US2] Write failing unit tests for `useEmailActions` delete path: happy path (calls `onRemove` then `client.trash`), failure revert, in-flight guard independent from archive in-flight; then extend `useEmailActions` with a `delete` action implementing these behaviors in `src/tui/hooks/useEmailActions.ts`
- [ ] T007 [P] [US2] Write failing unit tests for `useKeyboard` `#` key: dispatches `onDelete` with current email id when non-empty; no-op when empty; no-op when filter input is active; then add `onDelete?: (emailId: string) => void` option and `#` key handler to `useKeyboard` in `src/tui/hooks/useKeyboard.ts`
- [ ] T008 [US2] Write failing integration test — render `InboxApp` with mocked client and 3 emails, simulate `#` keypress, verify highlighted email absent and `trash` spy called — in `tests/integration/email-actions.test.ts`; then wire `useEmailActions.delete` into `InboxApp` (pass `onDelete` lambda to `useKeyboard`) in `src/tui/app.tsx`

**Checkpoint**: US1 and US2 both functional — `e` archives, `#` deletes, both update list immediately.

---

## Phase 5: User Story 3 — Actions Active in Preview Pane Context (Priority: P3)

**Goal**: Confirm `e` and `#` remain fully operational while the user is interacting with the `EmailPreview` pane (e.g., has tabbed to a URL link). Also validates the error-revert path end-to-end.

**Independent Test**: Render `InboxApp`, Tab into `EmailPreview` link-focus mode, press `e` — email is archived and removed from list; the centralized handler was not blocked by preview interaction.

- [ ] T009 [US3] Write failing integration tests — (1) Tab into `EmailPreview` link-focus then press `e`: email still archived and removed; (2) archive throws: email restored to original list position and red error text appears in footer — in `tests/integration/email-actions.test.ts`; verify tests pass with no changes (centralized handler design covers this); fix handler dispatch or error wiring in `src/tui/hooks/useKeyboard.ts` or `src/tui/app.tsx` if gaps are found

**Checkpoint**: All three user stories independently verified — actions work from any view context, errors revert cleanly.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T010 [P] Add `e archive  # delete` to the footer key-hint `<Text dimColor>` line in `src/tui/app.tsx`
- [ ] T011 [P] Write failing unit test for auto-clear behavior (`actionError` becomes `null` after 4 000 ms) in `tests/unit/tui/useEmailActions.test.ts`; then implement the `useEffect`/`setTimeout` auto-clear in `src/tui/hooks/useEmailActions.ts`
- [ ] T012 [P] Write unit test verifying that after `removeEmail` reduces list length to 1 and index was at that position, `useKeyboard` clamps to the last valid index (covers FR-005 single-item edge case) in `tests/unit/tui/useKeyboard.actions.test.ts`
- [ ] T013 Run full test suite (`npm test`) and confirm all integration scenarios green; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1; **BLOCKS all user stories**
- **US1 (Phase 3)**: Unblocked after T002; T003 and T004 are parallel; T005 depends on both
- **US2 (Phase 4)**: Unblocked after T002; T006 and T007 are parallel with each other (T006 extends hook from T003, so depends on T003); T008 depends on both
- **US3 (Phase 5)**: Requires US1 + US2 complete
- **Polish (Phase 6)**: Requires US3 complete; T010/T011/T012 are parallel with each other

### User Story Dependencies

- **US1 (P1)**: Unblocked after Foundational
- **US2 (P2)**: Unblocked after Foundational + T003 (extends the hook US1 creates)
- **US3 (P3)**: Requires US1 + US2 complete; validates combined behavior

### Within Each User Story

1. Write failing tests → verify FAIL
2. Implement → tests pass
3. Integration test + wiring last (after unit-level pieces)

---

## Parallel Example: User Story 1

```bash
# T003 and T004 can run in parallel (different files):
Task A: "Write failing tests + create useEmailActions hook in src/tui/hooks/useEmailActions.ts"
Task B: "Write failing tests + add 'e' handler to src/tui/hooks/useKeyboard.ts"

# T005 runs after both complete:
Task C: "Write failing integration test + wire into src/tui/app.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001)
2. Complete Phase 2 (T002)
3. Complete Phase 3 (T003 → T004 → T005)
4. **STOP and VALIDATE**: `e` key archives in running TUI; list updates instantly
5. Demo-ready: single-key archive from inbox

### Incremental Delivery

1. Setup + Foundational → state mutations ready
2. US1 → `e` archives, optimistic UI + error handling
3. US2 → `#` deletes, minimal delta on top of US1
4. US3 → validated across all view contexts
5. Polish → key hints, auto-clear, edge cases

---

## Notes

- `[P]` = different files, no in-phase task dependencies — safe to parallelize
- Each task: write failing test first, verify FAIL, then implement, verify PASS
- `useEmailActions` owns all action state (`inFlightIds`, `actionError`)
- `useKeyboard` receives callback props only — no direct `GmailClient` knowledge
- `EmailPreview` and `EmailList` are **not modified**
- Constitution Principle I deviation documented in `plan.md` Complexity Tracking
