# Tasks: AI Email Summary

**Input**: Design documents from `/specs/006-glm-ai-summary/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Each task includes writing tests AND implementation together (TDD approach)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow single project structure as defined in plan.md

---

## Phase 1: Setup ✅ COMPLETE

**Purpose**: Project initialization (minimal - all dependencies already exist)

**Status**: ✅ **ALREADY COMPLETE** - No action needed

All required dependencies and infrastructure are already configured:

- ✅ TypeScript 5.7, Node.js 20+
- ✅ Ink 4.x (React for CLI)
- ✅ React 18.x
- ✅ @anthropic-ai/sdk (Anthropic AI provider)
- ✅ openai (OpenAI AI provider)
- ✅ better-sqlite3 (SQLite database)
- ✅ vitest (Testing framework)
- ✅ All linting, formatting, and build tools configured

**➡️ PROCEED DIRECTLY TO PHASE 2**

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema changes that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 [P] Add summary column to emails table via migration in src/core/persistence/migrations/003_add_summary_column.sql
- [x] T002 [P] Add summary field to EmailSchema and update Email type in src/core/models/validation.ts
- [x] T003 Update EmailRepository save() method to persist summary field in src/core/services/email-repository.ts
- [x] T004 Update EmailRepository mapRowToEmail() method to retrieve summary field in src/core/services/email-repository.ts

**Checkpoint**: Database schema ready - user story implementation can now begin

**Validation**: Run `npm test` to ensure repository tests still pass with new field

---

## Phase 3: User Stories 1 & 2 - Core Summary Generation & Viewing (Priority: P1) 🎯 MVP

**Goal**: Users can generate AI summaries with correct format (one sentence + action items) and toggle between full email and summary views

**Independent Test**: Select an email, press 's', verify summary appears with correct format (one sentence + bullet list), verify LLM called only once per email

### Implementation for User Stories 1 & 2

- [x] T005 [P] [US1] [US2] Build prompt for summary generation with tests in src/core/ai/summary-prompt.ts and tests/unit/ai/summary-prompt.test.ts
- [x] T006 [P] [US1] [US2] Create EmailSummary type and error classes with tests in src/core/services/summary-service.ts and tests/unit/core/summary-service.test.ts
- [x] T007 [US1] [US2] Implement SummaryService.generateSummary() method with tests in src/core/services/summary-service.ts and tests/unit/core/summary-service.test.ts
- [x] T008 [US1] [US2] Implement SummaryService response parsing and validation with tests in src/core/services/summary-service.ts and tests/unit/core/summary-service.test.ts
- [x] T009 [US1] Remove global 's' shortcut from app.tsx keyboard handler in src/cli/app.tsx
- [x] T010 [US1] Add summary view state and toggle handler to EmailDetail component with tests in src/cli/components/email-detail.tsx and tests/unit/cli/email-detail-summary.test.tsx
- [x] T011 [US1] [US2] Render summary view with formatted content (sentence + bullet list) with tests in src/cli/components/email-detail.tsx and tests/unit/cli/email-detail-summary.test.tsx
- [x] T012 [US1] Add 's' keyboard shortcut to EmailDetail component in src/cli/components/email-detail.tsx

**Checkpoint**: At this point, users can generate and view AI summaries with the correct format. Pressing 's' toggles between full email and summary views.

**Validation**:

1. Run `npm test` - all tests should pass
2. Start app with `npm run dev`
3. Select email, press 's', verify summary appears with correct format
4. Press 's' again, verify view returns to full email
5. Press 's' again, verify summary appears immediately (from cache, no new LLM call)

---

## Phase 4: User Story 3 - Persistent Summary Storage (Priority: P2)

**Goal**: Summaries persist across application restarts, LLM called only once per email

**Independent Test**: Generate summary, close app, reopen, select same email, press 's', verify summary appears immediately without LLM call

### Implementation for User Story 3

- [x] T013 [US3] Implement summary persistence in EmailDetail component (save after generation) with tests in src/cli/components/email-detail.tsx and tests/unit/cli/email-detail-summary.test.tsx
- [ ] T014 [US3] Add integration test for full summary flow (generate, save, retrieve, display) in tests/integration/email-summary-flow.test.ts

**Checkpoint**: Summaries now persist in database. LLM called only once per email even after app restart.

**Validation**:

1. Run `npm test` - all tests including integration test should pass
2. Generate summary for an email
3. Close and reopen app
4. Select same email, press 's', verify summary appears instantly (<100ms)
5. Check database: `sqlite3 ~/.gmail-sweep/gmail-sweep.db "SELECT id, summary FROM emails WHERE summary IS NOT NULL LIMIT 5;"`

---

## Phase 5: User Story 4 - Error Handling (Priority: P2)

**Goal**: Clear error messages and retry capability when LLM calls fail

**Independent Test**: Simulate LLM API failure (disable network or use invalid API key), press 's', verify error message appears, press 's' again to retry

### Implementation for User Story 4

- [x] T015 [US4] Add loading state indicator during summary generation with tests in src/cli/components/email-detail.tsx and tests/unit/cli/email-detail-summary.test.tsx
- [x] T016 [US4] Add error state display and retry functionality with tests in src/cli/components/email-detail.tsx and tests/unit/cli/email-detail-summary.test.tsx
- [x] T017 [US4] Handle edge cases (no email selected, empty body, rapid email switching) with tests in src/cli/components/email-detail.tsx and tests/unit/cli/email-detail-summary.test.tsx

**Checkpoint**: All error states handled gracefully. Users can retry failed generations.

**Validation**:

1. Run `npm test` - all tests should pass
2. Test with invalid API key - verify error message appears
3. Press 's' again - verify retry occurs
4. Test rapid email switching during generation - verify no crashes

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 [P] Update help panel to show 's' as "Toggle summary" in detail view context in src/cli/help.ts
- [x] T019 [P] Update AGENTS.md with AI summary feature documentation in AGENTS.md
- [ ] T020 Run quickstart.md validation scenarios and fix any issues
- [ ] T021 Performance optimization: ensure summary retrieval < 100ms (add timing tests if needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: ✅ **ALREADY COMPLETE** - Skip this phase
- **Foundational (Phase 2)**: No dependencies - **START HERE** - BLOCKS all user stories
- **User Stories 1 & 2 (Phase 3)**: Depends on Phase 2 completion - MVP delivery
- **User Story 3 (Phase 4)**: Depends on Phase 3 completion (needs working generation first)
- **User Story 4 (Phase 5)**: Depends on Phase 3 completion (needs working generation to test errors)
- **Polish (Phase 6)**: Depends on all user stories being complete

**⚠️ KEY POINT**: Begin implementation with Phase 2 (Foundational). Phase 1 requires no action.

### User Story Dependencies

- **User Stories 1 & 2 (P1)**: Can start after Phase 2 - Foundation for all other stories
- **User Story 3 (P2)**: Depends on US1 & US2 being complete (needs generation working first)
- **User Story 4 (P2)**: Depends on US1 & US2 being complete (needs generation working to test errors)

### Within Each Phase

- **Phase 2 (Foundational)**:
  - T001 and T002 can run in parallel (different files)
  - T003 and T004 are sequential (both modify same file)
- **Phase 3 (US1 & US2)**:
  - T005 and T006 can run in parallel (different files)
  - T007 depends on T006 (same file, needs types)
  - T008 depends on T007 (same file, builds on generateSummary)
  - T009 and T010 can run in parallel (different files)
  - T011 depends on T010 (same file, needs state)
  - T012 depends on T011 (same file, needs render)

### Parallel Opportunities

- **Phase 2**: T001 and T002 can run in parallel
- **Phase 3**: T005 and T006 can run in parallel; T009 and T010 can run in parallel
- **Phase 6**: T018 and T019 can run in parallel

---

## Parallel Example: Phase 3 (User Stories 1 & 2)

```bash
# Launch foundational data layer tasks in parallel:
Task: "Build prompt for summary generation with tests in src/core/ai/summary-prompt.ts"
Task: "Create EmailSummary type and error classes with tests in src/core/services/summary-service.ts"

# After those complete, launch UI layer tasks in parallel:
Task: "Remove global 's' shortcut from app.tsx"
Task: "Add summary view state and toggle handler to EmailDetail component with tests"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. ✅ **SKIP Phase 1** (already complete - all dependencies exist)
2. **START HERE**: Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Stories 1 & 2
4. **STOP and VALIDATE**: Test summary generation and viewing independently
5. Deploy/demo if ready - users can now generate and view AI summaries!

### Incremental Delivery

1. ✅ Phase 1: Complete (skip - no action needed)
2. **START HERE**: Phase 2 Foundational → Database schema ready
3. Add Phase 3 (US1 & US2) → Test independently → Deploy/Demo (MVP! 🎯)
4. Add Phase 4 (US3) → Test independently → Deploy/Demo (persistence added)
5. Add Phase 5 (US4) → Test independently → Deploy/Demo (error handling complete)
6. Phase 6 Polish → Final cleanup and documentation
7. Each phase adds value without breaking previous functionality

### Sequential Implementation (Single Developer) - START WITH PHASE 2

**⚠️ IMPORTANT: Phase 1 is already complete. Begin with Phase 2.**

With one developer, follow this order:

1. **Phase 2** (Foundational - START HERE): T001 → T002 → T003 → T004
2. **Phase 3** (US1 & US2 - MVP): T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012
3. **Phase 4** (US3): T013 → T014
4. **Phase 5** (US4): T015 → T016 → T017
5. **Phase 6** (Polish): T018 → T019 → T020 → T021

---

## Task Details

### T001: Add summary column migration

- Create `src/core/persistence/migrations/003_add_summary_column.sql`
- SQL: `ALTER TABLE emails ADD COLUMN summary TEXT;`
- Migration will be auto-applied on next app start
- No data migration needed (column is nullable)

### T002: Update Email model

- Add `summary: z.string().optional()` to EmailSchema in `src/core/models/validation.ts`
- This automatically updates the inferred `Email` type
- Field will be `string | undefined`

### T003 & T004: Update EmailRepository

- Add `summary` to INSERT column list and VALUES placeholders
- Add `email.summary || null` parameter to stmt.run()
- Add `summary: row.summary` to mapRowToEmail return object

### T005: Build summary prompt

- Create `buildSummaryPrompt(email: Email)` function
- Return `{ system: string, user: string }`
- System prompt instructs JSON format with summary and actionItems
- User prompt includes email subject, sender, date, and body
- Write tests first, ensure they fail, then implement

### T006: Create SummaryService types

- Define `EmailSummary` interface (summary: string, actionItems: string[])
- Create `SummaryGenerationError` and `SummaryParseError` classes
- Create SummaryService class with constructor
- Write tests for type validation and error handling

### T007: Implement generateSummary

- Build prompt using buildSummaryPrompt
- Call AI provider (need to add callLLM method or use existing patterns)
- Return parsed EmailSummary
- Handle API errors and wrap in SummaryGenerationError
- Write tests with mocked AI provider

### T008: Implement response parsing

- Strip markdown code blocks if present
- Parse JSON string
- Validate schema (summary is string, actionItems is array of strings)
- Handle parse errors and validation errors
- Write comprehensive parsing tests

### T009: Remove global 's' shortcut

- Find 's' shortcut in app.tsx useKeyboard call
- Remove it from shortcuts array
- This frees 's' for use in EmailDetail component

### T010: Add summary view state

- Add state: `isShowingSummary`, `summaryStatus`, `summaryError`, `emailSummary`
- Create `handleToggleSummary` async function
- Check if summary exists → parse and show
- If no summary → generate, save, show
- Write tests for state transitions

### T011: Render summary view

- Add conditional render before normal email view
- Show subject, divider, "Summary:" label, summary text
- Show "Action Items:" label, bullet list of items
- Show "Press 's' to return to full email" hint
- Write tests for rendering

### T012: Add 's' keyboard shortcut

- Add `{ key: 's', handler: handleToggleSummary, description: 'Toggle summary' }` to EmailDetail's useKeyboard shortcuts
- Ensure it doesn't conflict with other shortcuts

### T013: Implement persistence

- After successful generation, save email with summary to database
- Use EmailRepository.save()
- Handle save errors gracefully
- Write tests for persistence flow

### T014: Integration test

- Test full flow: generate → save → retrieve → display
- Use real database (in-memory for tests)
- Use real or carefully mocked AI provider
- Verify LLM called only once per email

### T015: Add loading state

- Show "Generating summary..." in status line when status is 'loading'
- Clear message when complete
- Write tests for loading UI

### T016: Add error state

- Show error message in status line when status is 'error'
- Allow retry by pressing 's' again
- Clear error on retry
- Write tests for error handling

### T017: Handle edge cases

- No email selected: do nothing on 's' press
- Empty email body: use snippet instead
- Rapid email switching: cancel in-progress generation
- Malformed LLM response: show raw response with warning
- Write tests for each edge case

### T018-T021: Polish tasks

- Update help text to document 's' key
- Update AGENTS.md with feature overview
- Run through quickstart.md scenarios
- Add performance benchmarks if needed

## Bugfix Backlog

- [x] B001 [US1] Reset detail pane from summary view to full email when selection changes in `src/cli/components/email-detail.tsx`; add regression test in `tests/unit/cli/email-detail-summary.test.tsx` to verify: (1) press `s` on Email A shows summary, (2) navigate to Email B auto-shows full detail, not Email A summary, (3) pressing `s` on Email B then shows Email B summary.

**B001 Notes**:

- **Actual**: After toggling summary on one email, moving selection keeps summary view/state from prior email.
- **Expected**: Selecting a different email always defaults detail pane to full email view for the newly selected email.

## Refactor Backlog

- [X] R001 [US1] Strengthen B001 regression test to reproduce real keyboard flow in `tests/unit/cli/email-detail-summary.test.tsx` by capturing `useKeyboard` shortcuts and invoking the `s` handler; TDD steps: (1) write failing test that presses `s` on Email A and expects `Summary:` visible, (2) rerender with Email B and expect full detail (`From:` visible, `Summary:` absent), (3) press `s` on Email B and expect Email B summary content; implementation should only adjust test harness/mocks (not component behavior) until test fails then passes.
- [X] R002 [US4] Add stale-request protection for summary generation in `src/cli/components/email-detail.tsx` to prevent stale async results from prior selection overwriting current email view; TDD steps: (1) write failing test in `tests/unit/cli/email-detail-summary.test.tsx` that starts generation for Email A, switches to Email B before Promise resolves, then resolves A and asserts A summary is not rendered, (2) implement request token/ref guard (or cancellation flag) around `generateSummary` completion path and `onSaveSummary` persistence, (3) verify current-email-only state updates for success and error branches.
- [X] R003 [US1] Replace ad-hoc debug file writes with centralized AI debug logger utility; create `src/core/logging/ai-debug-log.ts` (single `logAiDebug(context, message, meta?)` entrypoint gated by `DEBUG_AI=true`) and migrate calls from `src/cli/components/email-detail.tsx`, `src/core/ai/provider.ts`, and `src/cli/index.ts`; TDD steps: (1) add unit tests in `tests/unit/core/ai-debug-log.test.ts` for env gating and message format, (2) update existing tests/mocks to confirm no direct `appendFileSync` usage in component/provider code paths.
- [X] R004 [US1] Make debug log path cross-platform by deriving path via `os.tmpdir()` and `path.join` inside the new logger utility (`src/core/logging/ai-debug-log.ts`); TDD steps: (1) add test that mocks `os.tmpdir()` and asserts output path join behavior, (2) add test for fallback behavior when temp directory is unavailable/unwritable (logger must fail-safe without crashing app), (3) remove remaining hardcoded `'/tmp/gmail-sweep-debug.log'` strings from `src/`.
- [X] R005 [US1] Establish lint-clean baseline for touched summary files and fix the current unescaped apostrophe violation in `src/cli/components/email-detail.tsx`; TDD steps: (1) add/adjust tests if rendering text changes (e.g., escaped quote in summary hint), (2) run `npm run lint` and ensure zero errors in touched files (`src/cli/components/email-detail.tsx`, `src/cli/index.ts`, `src/core/ai/provider.ts`, `tests/unit/cli/email-detail-summary.test.tsx`), (3) document remaining pre-existing repo-wide lint issues as non-blocking follow-up items if outside this scope.

**R001-R005 Acceptance Gate**:

1. `npm test -- tests/unit/cli/email-detail-summary.test.tsx tests/unit/core/ai-debug-log.test.ts`
2. `npm run build`
3. `npm run lint` (no new errors; touched-file errors resolved)
4. Manual verification: run app, press `s` on Email A, move to Email B, confirm detail view resets and stale summary never appears.

---

## Notes

- **TDD Approach**: Each task includes writing tests FIRST, then implementation
- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Independent testing**: Each user story phase is independently testable
- **Commit strategy**: Commit after each task or logical group
- **Checkpoints**: Stop at each checkpoint to validate independently
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies

## Estimated Effort

- **Phase 2** (Foundational): 30 minutes
- **Phase 3** (US1 & US2 - MVP): 3-4 hours
- **Phase 4** (US3): 1 hour
- **Phase 5** (US4): 1.5 hours
- **Phase 6** (Polish): 30 minutes

**Total**: ~6-7 hours for complete feature with tests

## Success Criteria

After all tasks complete:

- ✅ Users can generate summaries with single 's' key press
- ✅ Summaries follow correct format (one sentence + bullet list)
- ✅ Summaries persist across app restarts
- ✅ LLM called exactly once per email
- ✅ Loading and error states clearly communicated
- ✅ Retry capability on failures
- ✅ All tests pass (`npm test`)
- ✅ Manual testing scenarios from quickstart.md pass
