# Tasks: AI Summary

**Input**: Design documents from `/specs/006-openai-ai-summary/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Strict TDD is mandatory for this feature. There are no standalone test-only tasks. Every task includes writing failing tests against a stub/minimal implementation, then iterating code until tests pass.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`) for story phases only
- Every task includes concrete file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish reusable fixtures and test harness scaffolding for summary feature work.

- [X] T001 Create AI summary fixtures in `tests/unit/fixtures/ai_summary.fixtures.ts` by first writing failing imports/usages in `tests/unit/email_summary_service.test.ts` and `tests/unit/openai_provider.test.ts`, then implementing fixture builders and iterating until all related tests pass.
- [X] T002 [P] Create contract test scaffold in `tests/contract/email_summary.test.ts` by first writing failing contract assertions for sentence-plus-bullets shape, then implementing the minimal harness wiring and iterating until tests pass.
- [X] T003 [P] Prepare runtime dependency hooks for summary components in `src/tui/ink_runtime.ts` and `src/cli/app.ts` by first writing failing wiring assertions in `tests/unit/cli_app.test.ts` and `tests/unit/tui_app.test.ts`, then implementing typed option plumbing and iterating until tests pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared AI summary contracts, persistence, and orchestration required by all stories.

**⚠️ CRITICAL**: No user story implementation starts until this phase is complete.

- [X] T004 Define summary provider contract in `src/adapters/ai/provider.ts` and prompt construction in `src/adapters/ai/prompt.ts` by first writing failing contract/prompt tests in `tests/unit/ai_provider_factory.test.ts`, `tests/unit/openai_provider.test.ts`, and `tests/unit/anthropic_provider.test.ts`, then implementing interfaces and prompt builder until all tests pass.
- [X] T005 [P] Implement OpenAI summary generation/parsing in `src/adapters/ai/openai.ts` by first writing failing tests in `tests/unit/openai_provider.test.ts` for structured summary output, malformed payload handling, and empty action-item fallback behavior, then iteratively implementing until tests pass.
- [X] T006 [P] Implement Anthropic summary generation/parsing in `src/adapters/ai/anthropic.ts` by first writing failing tests in `tests/unit/anthropic_provider.test.ts` for structured summary output and malformed payload recovery, then iteratively implementing until tests pass.
- [X] T007 [P] Implement persistent summary storage adapter in `src/adapters/storage/summary_store.ts` by first writing failing persistence and malformed-file tests in `tests/unit/summary_store.test.ts`, then implementing file read/write, schema validation, and upsert behavior until tests pass.
- [X] T008 Implement get-or-generate summary workflow in `src/services/email_summary_service.ts` by first writing failing tests in `tests/unit/email_summary_service.test.ts` for cache-hit behavior, one-call generation, normalization to one sentence plus bullets, and `- None` fallback, then iteratively implementing until tests pass.
- [X] T009 Wire summary service creation into app runtime in `src/cli/app.ts` and `src/tui/ink_runtime.ts` by first writing failing wiring tests in `tests/unit/cli_app.test.ts` and `tests/integration/cli_browse_workflow.test.ts`, then implementing runtime integration until tests pass.

**Checkpoint**: Summary provider + storage + service foundations are complete and green.

---

## Phase 3: User Story 1 - Generate And Show AI Summary (Priority: P1) 🎯 MVP

**Goal**: Pressing `s` from full detail generates summary once (if missing), shows spinner while loading, and renders normalized summary content.

**Independent Test**: Open detail for an email without cached summary, press `s`, verify spinner appears, verify repeated `s` during loading is ignored, verify summary renders as sentence followed by bullet list (`- None` when no actions).

- [X] T010 [US1] Add `s` command mapping in `src/tui/input_controller.ts` by first writing failing key-mapping tests in `tests/unit/input_controller.test.ts`, then implementing parse/mapping updates until tests pass.
- [X] T011 [US1] Implement detail summary subview state machine (`full`/`loading_summary`/`summary`) and loading spinner rendering in `src/tui/app.ts` by first writing failing state/render tests in `tests/unit/tui_app.test.ts` and `tests/unit/tui_app.progress.test.ts`, then iteratively implementing until tests pass.
- [X] T012 [US1] Implement first-time summary generation flow in `src/tui/app.ts` using selected message detail and summary service calls by first writing failing behavior tests in `tests/integration/detail_navigation_flow.test.ts` and `tests/integration/detail_navigation_keys.test.ts`, then iteratively implementing until tests pass.
- [X] T013 [US1] Enforce summary format contract display (sentence + bullets, including `- None`) in `src/services/email_summary_service.ts`, `src/tui/app.ts`, and `tests/contract/email_summary.test.ts` by first writing failing contract/integration assertions, then iteratively implementing until tests pass.

**Checkpoint**: User Story 1 delivers end-to-end summary generation and display.

---

## Phase 4: User Story 2 - Toggle Between Summary And Full Detail (Priority: P1)

**Goal**: `s` toggles between cached summary and full detail for the currently selected email without unnecessary LLM calls.

**Independent Test**: For an email with persisted summary, press `s` to open summary without calling provider, press `s` again to return to full detail; restart app and confirm cached summary is reused.

- [X] T014 [US2] Implement cached-summary fast path (no new provider call) in `src/services/email_summary_service.ts` and `src/tui/app.ts` by first writing failing cache-hit tests in `tests/unit/email_summary_service.test.ts` and `tests/unit/tui_app.test.ts`, then iteratively implementing until tests pass.
- [X] T015 [US2] Implement bidirectional summary/full toggle behavior in `src/tui/app.ts` by first writing failing toggle-cycle tests in `tests/unit/tui_app.test.ts` and `tests/integration/detail_navigation_keys.test.ts`, then iteratively implementing until tests pass.
- [X] T016 [US2] Implement cross-restart persistence verification path in `src/cli/app.ts` and `src/adapters/storage/summary_store.ts` by first writing failing multi-session integration assertions in `tests/integration/detail_navigation_flow.test.ts`, then iteratively implementing until tests pass.
- [X] T017 [US2] Prevent stale summary results from overwriting newly selected email detail in `src/tui/app.ts` by first writing failing selection-switch race tests in `tests/unit/tui_app.test.ts` and `tests/integration/detail_navigation_keys.test.ts`, then iteratively implementing until tests pass.

**Checkpoint**: User Story 2 delivers stable toggle behavior and persisted reuse.

---

## Phase 5: User Story 3 - Handle Summary Failures Safely (Priority: P2)

**Goal**: On generation failure, keep full detail visible, show error, do not persist bad data, and allow retry.

**Independent Test**: Force provider failure for uncached email, press `s`, verify full detail remains active with error message; press `s` again after failure and verify retry path remains available.

- [X] T018 [US3] Implement summary failure UX in `src/tui/app.ts` and `src/services/email_summary_service.ts` by first writing failing failure-path tests in `tests/unit/tui_app.test.ts` and `tests/integration/detail_navigation_flow.test.ts`, then iteratively implementing until tests pass.
- [X] T019 [US3] Enforce non-persistence of failed or malformed summary payloads in `src/services/email_summary_service.ts` and `src/adapters/storage/summary_store.ts` by first writing failing resilience tests in `tests/unit/email_summary_service.test.ts` and `tests/unit/summary_store.test.ts`, then iteratively implementing until tests pass.
- [X] T020 [US3] Implement retry-after-failure behavior in `src/tui/app.ts` and `src/services/email_summary_service.ts` by first writing failing retry tests in `tests/integration/detail_navigation_keys.test.ts` and `tests/unit/tui_app.test.ts`, then iteratively implementing until tests pass.

**Checkpoint**: User Story 3 delivers safe error handling and retry semantics.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and full-suite validation across all stories.

- [X] T021 Update detail-view key help and user-facing wording in `src/tui/app.ts` and `specs/006-openai-ai-summary/quickstart.md` by first writing failing help-line assertions in `tests/integration/detail_navigation_keys.test.ts`, then iteratively implementing until tests pass.
- [X] T022 Run targeted feature verification (`npm run test -- tests/unit/input_controller.test.ts tests/unit/tui_app.test.ts tests/unit/email_summary_service.test.ts tests/unit/summary_store.test.ts tests/unit/openai_provider.test.ts tests/unit/anthropic_provider.test.ts tests/contract/email_summary.test.ts tests/integration/detail_navigation_flow.test.ts tests/integration/detail_navigation_keys.test.ts`) and resolve failures in touched files until green.
- [X] T023 Run full quality gates (`npm run test`, `npm run lint`, `npm run build`) and resolve feature-related regressions in touched files until all commands pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all story work.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 and US1 detail-summary baseline.
- **Phase 5 (US3)**: Depends on Phase 2 and uses US1/US2 summary flows.
- **Phase 6 (Polish)**: Depends on completion of in-scope story phases.

### User Story Dependencies

- **US1 (P1)**: First MVP increment; no dependency on other stories after foundational phase.
- **US2 (P1)**: Depends on US1 summary generation flow and foundational persistence/service layers.
- **US3 (P2)**: Depends on summary generation/toggle flow established by US1/US2.

### Within Each Task (TDD Rule)

- Start by writing failing tests listed in the task description.
- Add minimal implementation/stub to satisfy failing assertions.
- Iterate implementation and refactor only after tests are green.
- Do not split test-writing into separate checklist tasks.

### Parallel Opportunities

- **Setup**: `T002` and `T003` can run in parallel after `T001`.
- **Foundational**: `T005`, `T006`, and `T007` can run in parallel after `T004`.
- **Story work**: `T016` and `T017` can run in parallel after `T014`/`T015` baseline behavior exists.

---

## Parallel Example: User Story 1

```bash
# After T010 is done, these can be split across developers:
Task: "T011 [US1] Implement detail summary subview state machine and spinner in src/tui/app.ts"
Task: "T013 [US1] Enforce summary format contract in src/services/email_summary_service.ts and tests/contract/email_summary.test.ts"
```

## Parallel Example: User Story 2

```bash
# After cached-toggle baseline exists:
Task: "T016 [US2] Implement cross-restart persistence verification path in src/cli/app.ts and src/adapters/storage/summary_store.ts"
Task: "T017 [US2] Prevent stale summary results from overwriting newly selected email detail in src/tui/app.ts"
```

## Parallel Example: User Story 3

```bash
# Failure handling and persistence hardening can proceed together once failure UX baseline lands:
Task: "T019 [US3] Enforce non-persistence of failed/malformed summary payloads in src/services/email_summary_service.ts and src/adapters/storage/summary_store.ts"
Task: "T020 [US3] Implement retry-after-failure behavior in src/tui/app.ts and src/services/email_summary_service.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 + Phase 2.
2. Complete US1 (`T010-T013`).
3. Validate independent US1 acceptance before expanding scope.

### Incremental Delivery

1. Deliver US1 generation + spinner + formatted summary.
2. Deliver US2 fast toggling + cached reuse + restart persistence.
3. Deliver US3 failure safety + retry semantics.
4. Finish with Phase 6 validation and polish.

### Team Parallelization

1. Complete Setup + Foundational together.
2. Split US1 and contract enforcement across contributors.
3. Split US2 persistence and stale-request protection once toggle baseline exists.
4. Split US3 persistence hardening and retry behavior once failure baseline exists.

---

## Notes

- All tasks are execution-ready and use strict checklist format.
- Every task includes tests plus implementation in a single unit of work.
- No standalone test-writing tasks are included.
