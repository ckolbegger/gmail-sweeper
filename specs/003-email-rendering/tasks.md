# Tasks: Email Detail Rendering Improvements

**Input**: Design documents from `/specs/003-email-rendering/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Tests**: Strict TDD is required. There are no standalone test-creation tasks; each implementation task starts by writing failing tests. Separate final integration verification tasks are included as release checks.

**Organization**: Tasks are grouped by user story for independent delivery and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Every task includes exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare formatter scaffolding and shared fixtures for deterministic rendering tests.

- [X] T001 Create formatter scaffolding by first writing failing baseline tests in `tests/unit/email_detail_formatter.test.ts`, then add `src/tui/email_detail_formatter.ts` with exported transform entrypoints used by detail rendering.
- [X] T002 [P] Add shared rendering fixtures by first writing failing fixture-consumption tests in `tests/unit/email_preview.test.ts`, then create `tests/unit/fixtures/email_detail_rendering.fixtures.ts` for blank-line, URL-heavy, and HTML-vs-plain reconciliation bodies.
- [X] T003 [P] Add HTML parser foundation by first writing failing parser-smoke tests in `tests/unit/html_anchor_extractor.test.ts`, then add `htmlparser2` to `package.json` (and lockfile), and wire parser usage in `src/tui/html_anchor_extractor.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared normalization and truncation primitives required by all core stories.

**CRITICAL**: Complete this phase before story-specific integration work.

- [X] T004 Implement blank-line normalization primitive by first writing failing rule tests in `tests/unit/email_detail_formatter.test.ts`, then implement whitespace-only and mixed-line-ending collapse logic in `src/tui/email_detail_formatter.ts`.
- [X] T005 Implement width-cap truncation primitive by first writing failing rule tests in `tests/unit/email_detail_formatter.test.ts`, then implement `max(12, floor(detailPaneWidth / 2))` truncation with ellipsis-in-cap logic in `src/tui/email_detail_formatter.ts`.
- [X] T006 Implement URL normalization/reconciliation primitives by first writing failing rule tests in `tests/unit/html_anchor_extractor.test.ts`, then implement normalized URL keys (strip query params, ignore fragments/default ports, normalize case/slash) in `src/tui/html_anchor_extractor.ts`.
- [X] T007 Implement URL token extraction primitives by first writing failing rule tests in `tests/unit/email_detail_formatter.test.ts`, then implement punctuation-safe URL matching and replacement token plumbing in `src/tui/email_detail_formatter.ts`.

**Checkpoint**: Foundational formatter primitives are complete and unit-tested.

---

## Phase 3: User Story 1 - Readable Email Body Formatting (Priority: P1) 🎯 MVP

**Goal**: Collapse excessive blank lines while preserving non-blank text order in detail pane output.

**Independent Test**: Render detail with mixed content and 3+ blank-line runs; verify no run exceeds two lines and text order is unchanged.

- [X] T008 [US1] Wire normalization into preview rendering by first writing failing behavior tests in `tests/unit/email_preview.test.ts`, then integrate formatter pipeline into `src/tui/email_preview.ts`.
- [X] T009 [US1] Preserve navigation/detail stability by first writing failing flow tests in `tests/integration/detail_navigation_flow.test.ts`, then update detail render path in `src/tui/app.ts` to apply normalized content without breaking selection/view transitions.
- [X] T010 [US1] Cover edge cases for whitespace-only leading/trailing runs by first writing failing regression tests in `tests/integration/detail_navigation_keys.test.ts`, then refine normalization behavior in `src/tui/email_detail_formatter.ts` and `src/tui/email_preview.ts`.

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Human-Readable Link Display (Priority: P1)

**Goal**: Replace raw URLs with readable tokens (anchor text when available, else hostname) and enforce deterministic truncation rules.

**Independent Test**: Render bodies with long URLs, punctuation, and multiple links per line; verify replacements, boundary handling, and length caps.

- [X] T011 [US2] Expose HTML body for rendering by first writing failing contract and adapter tests in `tests/contract/email_detail.test.ts` and `tests/unit/get_email.test.ts`, then extend `src/adapters/gmail/get_email.ts` and related types to include decoded `html_body`.
- [X] T012 [US2] Implement HTML anchor extraction rules by first writing failing tests in `tests/unit/html_anchor_extractor.test.ts`, then implement `http/https`-only extraction, entity decode, whitespace collapse, `<base>` resolution, first-anchor precedence, and ambiguity fallback in `src/tui/html_anchor_extractor.ts`.
- [X] T013 [US2] Implement display-source selection with HTML preference by first writing failing tests in `tests/unit/email_detail_formatter.test.ts`, then prefer HTML anchor text over plain-text labels for matching normalized URLs in `src/tui/email_detail_formatter.ts`.
- [X] T014 [US2] Implement trailing punctuation exclusions and empty-anchor fallback by first writing failing tests in `tests/unit/email_detail_formatter.test.ts`, then enforce exclusion of `.,;:!?)]`, allow generic anchors, and fall back to hostname when normalized anchor text is empty in `src/tui/email_detail_formatter.ts`.
- [X] T015 [US2] Enforce truncation and failure fallback behavior by first writing failing tests in `tests/unit/email_preview.test.ts` and `tests/unit/html_anchor_extractor.test.ts`, then apply capped token rendering and silent fallback when HTML parse fails or `html_body` exceeds 1 MB in `src/tui/email_preview.ts` and `src/tui/html_anchor_extractor.ts`.
- [X] T016 [US2] Validate end-to-end URL rendering and fallback UX in TUI flows by first writing failing integration scenarios in `tests/integration/detail_navigation_flow.test.ts` (including plain-vs-HTML disagreement, parse-failure, and >1MB HTML fixtures), asserting no user-visible error/status message is shown for fallback paths, then adjust width propagation and detail rendering integration in `src/tui/app.ts` and `src/tui/ink_runtime.ts` as needed.

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Optional Link Actions (Priority: P2)

**Goal**: Keep optional link interaction work explicitly deferred from MVP while preserving clear extension points.

**Independent Test**: Confirm no regression in core rendering while optional interaction remains unimplemented.

- [X] T017 [US3] Preserve non-interactive and non-cached scope by first writing failing assertions in `tests/unit/email_preview.test.ts` that no copy/open interaction metadata or cache dependency is required in rendered output, then update deferral notes in `specs/003-email-rendering/quickstart.md` and `specs/003-email-rendering/contracts/email-rendering.ts`.

**Checkpoint**: Optional interaction remains intentionally deferred with explicit documentation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening and full validation across stories.

- [X] T018 Add final edge-case coverage by first writing failing tests for malformed URL-like tokens, multi-URL single-line bodies, and ambiguous anchor groups in `tests/unit/email_detail_formatter.test.ts` and `tests/unit/html_anchor_extractor.test.ts`, then finalize fixes in `src/tui/email_detail_formatter.ts` and `src/tui/html_anchor_extractor.ts`.
- [X] T019 Add final readability verification by first writing failing integration assertions in `tests/integration/detail_navigation_flow.test.ts` that no unbroken long URL dominates a detail-pane line, then finalize preview rendering in `src/tui/email_preview.ts` and `src/tui/app.ts`.
- [X] T020 Run final integration verification by executing `npm run test -- tests/integration/detail_navigation_flow.test.ts tests/integration/detail_navigation_keys.test.ts` and resolving feature-related failures in touched TUI files.
- [X] T021 Run contract-regression verification by executing `npm run test -- tests/contract/email_detail.test.ts` and resolving unintended side effects from `html_body` exposure and detail-pane rendering changes.
- [X] T022 Run full quality gates and quickstart validation in `specs/003-email-rendering/quickstart.md` by executing `npm run test`, `npm run lint`, and `npm run build` and resolving only feature-related failures.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): no dependencies
- Phase 2 (Foundational): depends on Phase 1; blocks all user stories
- Phase 3 (US1): depends on Phase 2
- Phase 4 (US2): depends on Phase 2 and can proceed after US1 preview wiring
- Phase 5 (US3): depends on US1/US2 completion for stable baseline behavior
- Phase 6 (Polish): depends on all in-scope story work

### User Story Dependencies

- **US1 (P1)**: first MVP increment after foundational work
- **US2 (P1)**: depends on shared formatter pipeline from US1 and adapter HTML exposure
- **US3 (P2, optional)**: intentionally deferred; documentation-only closure in current scope

### Within Each Task (TDD Rule)

- Write/adjust failing tests first in listed test files
- Implement minimum code to pass those tests
- Refactor only after green tests

### Parallel Opportunities

- T002 and T003 can run in parallel after initial scaffolding
- T004, T005, T006, and T007 can be split across contributors after shared scaffolding exists
- T012 and T013 can run in parallel after adapter HTML exposure (T011)

---

## Implementation Strategy

### MVP First

1. Complete Setup + Foundational (T001-T007)
2. Complete US1 (T008-T010)
3. Complete US2 (T011-T016)
4. Validate via T018-T022

### Incremental Delivery

1. Deliver whitespace normalization (US1) as first shippable increment
2. Deliver URL token readability/truncation (US2) as second increment
3. Keep optional interactions deferred with explicit documentation (US3)

---

## Notes

- All tasks are intentionally executable without separate test-task rows.
- Each task description encodes strict TDD sequencing.
- `[P]` markers are conservative and only used where file-level isolation is clear.
- Dedicated integration verification is intentionally separated in T020 as a final check.
