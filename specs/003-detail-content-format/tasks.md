# Tasks: Detail Pane Content Formatting

**Input**: Design documents from `specs/003-detail-content-format/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Strict TDD — writing the failing test is the **first step of every implementation task**. Do not write production code until the test exists and fails.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Create the new module scaffold so all user story phases have a place to build into.

- [X] T001 Create `src/core/text/body-formatter.ts` with exported TypeScript types (`LinkInfo`, `ProcessedLine`, `BodyProcessingResult`) matching `specs/003-detail-content-format/contracts/body-formatter.ts`, plus empty exported function stubs for `collapseBlankLines`, `truncateWithEllipsis`, and `processEmailBody` that throw `new Error('not implemented')`; create `tests/unit/core/text/body-formatter.test.ts` with a top-level `describe('body-formatter', () => {})` skeleton; verify `npm test` still passes

**Checkpoint**: New module exists, compiles, existing tests unaffected.

---

## Phase 2: Foundational

No blocking prerequisites beyond Phase 1. User story phases may begin after T001.

---

## Phase 3: User Story 1 — Blank Line Collapse (Priority: P1) 🎯 MVP

**Goal**: Emails with 3+ consecutive blank lines render with at most 2 consecutive blank lines.

**Independent Test**: Open (or mock) an email whose `bodyText` contains 5 consecutive blank lines; render `EmailPreview`; confirm no run of more than 2 blank lines appears in the output.

- [X] T002 [US1] In `tests/unit/core/text/body-formatter.test.ts`, write failing tests for `collapseBlankLines`: (a) 3+ consecutive blank lines → exactly 2, (b) 1–2 blank lines unchanged, (c) no blank lines unchanged, (d) blank lines at start/end of array, (e) empty array; then implement `collapseBlankLines(lines: string[]): string[]` in `src/core/text/body-formatter.ts` until all tests pass

- [X] T003 [US1] In `tests/unit/tui/EmailPreview.test.tsx`, write failing tests: render `EmailPreview` with an email whose `bodyText` has 5 consecutive `\n` blank lines and assert the rendered output contains no run of more than 2 blank lines; then update `src/tui/components/EmailPreview.tsx` to (a) add optional `paneWidth?: number` prop (default 80), (b) apply `collapseBlankLines` to `allBodyLines` after `body.split('\n')` before slicing for display; ensure all existing `EmailPreview` tests still pass

**Checkpoint**: US1 fully functional — blank line collapse works end-to-end in rendered component.

---

## Phase 4: User Story 2 — URL Display Truncation (Priority: P2)

**Goal**: URLs in the detail pane display as link text (HTML emails) or truncated bare URLs (plain-text emails), never exceeding half the pane width.

**Independent Test**: Render `EmailPreview` with (a) an HTML email containing `<a href="https://very.long.url/with/path">Click here</a>` and assert "Click here" appears with no raw URL visible; (b) a plain-text email containing a 200-character bare URL and assert the rendered output shows a string ending in `…` no longer than 40 characters (for an 80-column pane).

- [X] T004 [US2] In `tests/unit/core/text/body-formatter.test.ts`, write failing tests for `truncateWithEllipsis`: (a) string shorter than limit → unchanged, (b) string exactly at limit → unchanged, (c) string longer than limit → truncated with single `…` character at exactly `maxLength` length, (d) `maxLength` of 1 → just `…`, (e) empty string → unchanged; then implement `truncateWithEllipsis(text: string, maxLength: number): string` in `src/core/text/body-formatter.ts`

- [X] T005 [US2] In `tests/unit/core/text/body-formatter.test.ts`, write failing tests for `processEmailBody` **HTML path only**: (a) `<a href="https://example.com">Link text</a>` → `displayText` is "Link text", `fullUrl` is "https://example.com"; (b) link text longer than half `paneWidth` → `displayText` truncated with `…`; (c) whitespace-only or empty link text → `displayText` falls back to truncated URL; (d) multiple anchors in one email → all extracted into `allLinks` in document order; (e) HTML with no anchors → `allLinks` is empty; (f) `collapseBlankLines` still applied (3+ blank lines collapse to 2); (g) link's `lineIndex` equals the index of the `ProcessedLine` it appears in; then implement the HTML processing pipeline in `processEmailBody` (HTML path only) in `src/core/text/body-formatter.ts` — sentinel replacement of `<a>` tags before stripping, entity decoding, blank-line collapse, link substitution with truncation; **leave the plain-text path stub throwing `not implemented` — T006 adds it**

- [X] T006 [US2] In `tests/unit/core/text/body-formatter.test.ts`, write failing tests for `processEmailBody` **plain-text path** (extending T005's implementation): (a) bare `https://` URL shorter than half pane width → unchanged, no link text substitution; (b) bare `https://` URL longer than half pane width → truncated with `…`, `fullUrl` preserves original; (c) `http://` URLs detected; (d) multiple bare URLs in one body → all in `allLinks`; (e) plain text with no URLs → `allLinks` is empty; (f) `mailto:` URL detected and treated as a bare URL (truncated only, `fullUrl` preserved); (g) email with both `bodyText` and `bodyHtml` present → plain-text path is taken (no anchor extraction); then extend `processEmailBody` in `src/core/text/body-formatter.ts` to handle the plain-text path — the function now handles both paths; all T005 HTML-path tests must still pass

- [X] T007 [US2] In `tests/unit/tui/EmailPreview.test.tsx`, write failing tests: (a) HTML email with anchor renders link text not raw URL; (b) plain-text email with long URL renders truncated string ending in `…`; (c) rendered URL text length ≤ half of `paneWidth` prop; (d) re-render the same HTML email with a smaller `paneWidth` and assert the displayed URL/link text shrinks to match the new half-width limit (FR-005/SC-004); (e) a plain line with no URLs has its `links` array equal to `[]` not `undefined`; (f) existing tests remain green; then replace the inline `htmlToText` + `body.split('\n')` pipeline in `src/tui/components/EmailPreview.tsx` with a call to `processEmailBody(rawBody, isHtml, paneWidth)` — where `isHtml` is derived as `!email.bodyText && !!email.bodyHtml` — rendering `ProcessedLine[]` instead of raw string lines

**Checkpoint**: US2 fully functional — URL display truncation works end-to-end with correct half-width capping.

---

## Phase 5: User Story 3 — URL Interaction (Priority: P3)

**Goal**: Users can Tab through URLs in the detail pane; focused URL is highlighted; `c` copies full URL to clipboard, `o` opens it in the default browser.

**Independent Test**: Render `EmailPreview` with a mock email containing 2 URLs; simulate Tab keypress; assert the first URL is visually focused (inverse highlight); simulate Tab again; assert the second URL is focused; simulate `c`; assert clipboard write was called with the full original URL.

- [X] T008 [US3] In `tests/unit/tui/EmailPreview.test.tsx`, write failing tests: (a) with 0 URLs, Tab does nothing and no highlight appears; (b) with 2 URLs, first Tab focuses URL 0 (renders with `inverse`), second Tab focuses URL 1, third Tab wraps to URL 0; (c) Shift-Tab cycles backward; (d) `focusedLinkIndex` resets to null when a different email is selected; then add `focusedLinkIndex: number | null` local state (default `null`) and a `useInput` handler for Tab/Shift-Tab to `src/tui/components/EmailPreview.tsx`; render focused URL's `displayText` with Ink `inverse` prop; update scroll indicator to show `[tab] url` hint when `allLinks.length > 0`

- [X] T009 [US3] In `tests/unit/tui/EmailPreview.test.tsx`, write failing tests mocking `child_process.spawn`: (a) `c` keypress when no URL focused → `spawn` not called; (b) `c` keypress when URL 0 is focused → `spawn` called with the platform clipboard command and `fullUrl` as stdin; (c) full original URL (not truncated display text) is passed; then implement the `c` keypress handler in `src/tui/components/EmailPreview.tsx` using `child_process.spawn` with platform detection (`wl-copy` / `xclip`/ `pbcopy`)

- [X] T010 [US3] In `tests/unit/tui/EmailPreview.test.tsx`, write failing tests mocking `child_process.spawn`: (a) `o` keypress when no URL focused → `spawn` not called; (b) `o` keypress when URL is focused → `spawn` called with `xdg-open` (Linux) or `open` (macOS) and `fullUrl` as argument; then implement the `o` keypress handler in `src/tui/components/EmailPreview.tsx` using `child_process.spawn` with `process.platform` detection

**Checkpoint**: US3 fully functional — Tab cycles URLs, `c`/`o` trigger system actions with full original URL.

---

## Phase 6: Integration Test

**Purpose**: Verify the full body formatting pipeline end-to-end through the rendered component, without mocking `body-formatter`. Catches integration bugs that unit tests on isolated functions cannot.

- [X] T011 Create `tests/integration/email-preview-formatting.test.tsx`; write tests using `ink-testing-library` with real (unmocked) `body-formatter` functions: (a) HTML email with 5 consecutive blank lines + two anchors renders with ≤2 consecutive blank lines and both anchor texts visible (no raw URLs); (b) plain-text email with a 200-character `https://` URL renders truncated to ≤40 characters for `paneWidth=80`; (c) `mailto:` address in body is detected and truncated; (d) email with no URLs renders identically to current behaviour (regression guard); (e) re-render the same email with `paneWidth` changed from 80 to 40 and assert the displayed URL/link text is now capped at ≤20 characters — validating SC-004 end-to-end; (f) [US3, mock `child_process` only] Tab keypress on an email with 2 anchors moves focus to the first URL and renders it with `inverse` highlight — copy/open system calls are mocked; note: full clipboard/browser-open integration is excluded from automated tests due to CI environment constraints (no clipboard daemon, no display server); verify with `npm test tests/integration/email-preview-formatting.test.tsx`

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T012 Run full test suite with `npm test && npm run lint`; fix any type errors, lint warnings, or test failures introduced across all phases; confirm `tests/unit/core/text/body-formatter.test.ts`, `tests/unit/tui/EmailPreview.test.tsx`, and `tests/integration/email-preview-formatting.test.tsx` all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 3 (US1)**: Requires T001 complete
- **Phase 4 (US2)**: Requires T003 complete (uses `EmailPreview` with `paneWidth` prop already added)
- **Phase 5 (US3)**: Requires T007 complete (`processEmailBody` wired in, `allLinks` available to component)
- **Phase 6 (Integration)**: Requires T007 complete (US2 pipeline wired); US3 desirable but not required
- **Phase 7 (Polish)**: Requires all prior phases complete

### Within Each Phase

- Tasks are sequential (all share `body-formatter.ts` / `EmailPreview.tsx` / their test files)
- TDD within each task: write failing test → implement → confirm green → move on

### Parallel Opportunities

- None within a phase (shared files throughout)
- US1 and early US2 work (T004 `truncateWithEllipsis`) could theoretically start simultaneously since `truncateWithEllipsis` is independent, but sequential ordering is recommended for a single developer

---

## Parallel Example: Multi-developer scenario

```
Developer A (after T001):
  → T002 [US1]: collapseBlankLines implementation

Developer B (after T001):
  → T004 [US2]: truncateWithEllipsis implementation
  (no overlap with Developer A — different function in body-formatter.ts)
```

---

## Implementation Strategy

### MVP (User Story 1 only — ~2 tasks)

1. Complete T001 (setup)
2. Complete T002–T003 (US1: blank line collapse)
3. **Validate**: Run `npm test`, open an email with excessive whitespace, confirm collapse
4. Ship / demo

### Incremental Delivery

1. T001 → T002–T003 → Blank line collapse live ✅
2. T004–T007 → URL display truncation live ✅
3. T008–T010 → URL keyboard interaction live ✅
4. T011 → Integration tests green ✅
5. T012 → Full polish pass ✅

---

## Notes

- No [P] markers within phases — all tasks in each phase share the same source and test files
- Each task begins with the failing test; the implementation immediately follows in the same task
- `processEmailBody` (T005/T006) builds on `truncateWithEllipsis` (T004) — write T004 first
- Clipboard (T009) uses stdin piping for `wl-copy`/`xclip`; `pbcopy` uses same pattern
- `child_process.spawn` calls in T009/T010 should be extracted to thin wrappers for mockability
- No new npm dependencies — only Node.js built-ins (`child_process`)
