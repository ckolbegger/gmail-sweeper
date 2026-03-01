# Implementation Tasks: Colored Links in Email Detail Pane

## Story
As a user viewing an email in the detail pane, I want links to be rendered in a different color than body text so I can easily identify clickable/interactive elements.

## Branch
`003-kimi-detail-email-rendering`

## Related Specs
- `specs/email-rendering.md` - Original email rendering spec
- `specs/email-rendering-colored-links.md` - Detailed technical design

---

## Task Overview

| Task | Description | Est. Time |
|------|-------------|-----------|
| T001 | Add `formatEmailBodyWithLinks()` with Position Tracking | 60 min |
| T002 | Add `renderLineWithLinks()` Helper | 45 min |
| T003 | Add `adjustLinksForWrapping()` Helper | 30 min |
| T004 | Integrate Colored Links into EmailDetail Component | 30 min |
| T005 | Integration Tests for End-to-End Flow | 30 min |
| T006 | Final Verification & Polish | 15 min |

---

## T001: Add `formatEmailBodyWithLinks()` with Position Tracking

**Objective:** Extend the email body formatter to track where links appear in the formatted text.

**Acceptance Criteria:**
- [x] `LinkSegment` interface exported with `start`, `end`, `text`, `url` fields
- [x] `FormattedEmailBody` interface exported with `text` and `links` fields
- [x] **TDD Step 1:** Write failing tests for `formatEmailBodyWithLinks()`:
  - [x] Test: Single link position is correct after formatting
  - [x] Test: Multiple links have correct positions (non-overlapping)
  - [x] Test: Link positions account for blank line collapsing
  - [x] Test: Link positions account for URL shortening (shorter replacement text)
  - [x] Test: Link positions account for link text from HTML (different length than URL)
  - [x] Test: Empty links array returned when no URLs present
  - [x] Test: Link text truncated with `...` has correct position including ellipsis
- [x] **TDD Step 2:** Implement `formatEmailBodyWithLinks()` function
- [x] **TDD Step 3:** All tests pass

**Implementation Notes:**
- Use two-pass approach: find URLs first, then build result with position tracking
- Link positions are character indices in the formatted (but not yet wrapped) text
- Export new types from `src/cli/utils/email-body-formatter.ts`

**Files to Modify:**
- `src/cli/utils/email-body-formatter.ts` - Add new interfaces and function
- `tests/unit/cli/utils/email-body-formatter.test.ts` - Add tests (TDD Step 1)

---

## T002: Add `renderLineWithLinks()` Helper

**Objective:** Create helper function to render a line with colored link segments.

**Acceptance Criteria:**
- [x] **TDD Step 1:** Write failing tests for `renderLineWithLinks()`:
  - [x] Test: Line with no links renders plain text (no color)
  - [x] Test: Single link renders in cyan color
  - [x] Test: Multiple links on same line all have cyan color
  - [x] Test: Mixed content (text + link + text) renders with correct segments
  - [x] Test: Plain text segments have no color prop set
- [x] **TDD Step 2:** Implement `renderLineWithLinks()` function
- [x] **TDD Step 3:** All tests pass
- [x] Returns `React.ReactElement` with proper Text components
- [x] Uses `color: 'cyan'` for link segments

**Implementation Notes:**
- Split line into segments: [text][link][text][link]...
- Use `React.createElement(Text, { color: 'cyan' }, link.text)` for links
- Function signature: `renderLineWithLinks(line: string, links: LinkSegment[]): React.ReactElement`

**Files to Modify:**
- `src/cli/components/email-detail.tsx` - Add helper function
- `tests/unit/cli/components/email-detail.test.tsx` - Add tests (TDD Step 1)

---

## T003: Add `adjustLinksForWrapping()` Helper

**Objective:** Map link positions from formatted text to wrapped line coordinates.

**Acceptance Criteria:**
- [x] **TDD Step 1:** Write failing tests for `adjustLinksForWrapping()`:
  - [x] Test: Single link on first wrapped line has correct adjusted position
  - [x] Test: Link spanning multiple wrapped lines appears on each line
  - [x] Test: Multiple links on same wrapped line
  - [x] Test: No links returns empty map
  - [x] Test: Link at exact line boundary
- [x] **TDD Step 2:** Implement `adjustLinksForWrapping()` function
- [x] **TDD Step 3:** All tests pass
- [ ] Returns `Map<number, LinkSegment[]>` (line index → links on that line)

**Implementation Notes:**
- Map from line index to array of links on that line
- Adjust link start/end to be relative to each wrapped line
- Handle links that span multiple lines (appear on each line with adjusted positions)

**Files to Modify:**
- `src/cli/components/email-detail.tsx` - Add helper function
- `tests/unit/cli/components/email-detail.test.tsx` - Add tests (TDD Step 1)

---

## T004: Integrate Colored Links into EmailDetail Component

**Objective:** Wire up the helpers into the EmailDetail component.

**Acceptance Criteria:**
- [ ] **TDD Step 1:** Write failing integration tests:
  - [ ] Test: Component uses `formatEmailBodyWithLinks()` instead of `formatEmailBody()`
  - [ ] Test: Body rendering calls `renderLineWithLinks()` for each visible line
  - [ ] Test: Scrolling works correctly with colored links
  - [ ] Test: Works with email containing no URLs
  - [ ] Test: Works with email containing multiple URLs
- [ ] **TDD Step 2:** Update component to use new helpers:
  - [ ] Import `formatEmailBodyWithLinks` and types from formatter
  - [ ] Replace `formatEmailBody()` call with `formatEmailBodyWithLinks()`
  - [ ] Call `adjustLinksForWrapping()` after `wrapText()`
  - [ ] Update body rendering to use `renderLineWithLinks()`
- [ ] **TDD Step 3:** All tests pass

**Implementation Notes:**
- Keep existing keyboard handling and scrolling logic
- Only change the body rendering part
- Ensure all existing tests still pass

**Files to Modify:**
- `src/cli/components/email-detail.tsx` - Update component
- `tests/unit/cli/components/email-detail.test.tsx` - Add integration tests (TDD Step 1)

---

## T005: Integration Tests for End-to-End Flow

**Objective:** Story-level integration tests verifying the complete user flow.

**Acceptance Criteria:**
- [ ] **TDD Step 1:** Write failing integration tests:
  - [ ] Test: Email with HTML body shows link text in cyan color
  - [ ] Test: Email with plain text body shows shortened URLs in cyan color
  - [ ] Test: Email with multiple links shows all in cyan
  - [ ] Test: Link colors visible after scrolling through long email
  - [ ] Test: Blank line collapsing + colored links work together
- [ ] **TDD Step 2:** Create integration test file if needed, ensure tests fail for right reasons
- [ ] **TDD Step 3:** Run tests, fix any issues

**Implementation Notes:**
- These are higher-level integration tests
- May go in `tests/integration/` or remain in component tests
- Test the full flow: Email → format → wrap → render with colors

**Files to Modify:**
- `tests/integration/email-detail-colored-links.test.tsx` (new file)

---

## T006: Final Verification & Polish

**Objective:** Final verification and any remaining fixes.

**Acceptance Criteria:**
- [ ] All 428+ tests pass
- [ ] TypeScript compilation succeeds (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Color visible in light terminal theme
- [ ] Color visible in dark terminal theme
- [ ] No console warnings or errors
- [ ] Update `specs/email-rendering-colored-links.md` with final color choice

**Implementation Notes:**
- If cyan not visible enough, try `blue` or `magenta`
- Update spec with final decision
- Verify truncated links (with `...`) are fully colored

**Files to Review:**
- `src/cli/utils/email-body-formatter.ts`
- `src/cli/components/email-detail.tsx`
- `specs/email-rendering-colored-links.md`

---

## Implementation Notes for TDD

### Test-First Workflow
For each task:
1. **Write failing tests** - Create comprehensive test cases that will fail
2. **Implement minimal code** - Write just enough to make tests pass
3. **Run tests** - Verify all tests pass
4. **Refactor if needed** - Clean up code while keeping tests green

### Example TDD Cycle for T001
```typescript
// Step 1: Write failing test
it('should return link segment with correct position', () => {
  const result = formatEmailBodyWithLinks('Visit https://example.com', { maxWidth: 50 });
  expect(result.links).toHaveLength(1);
  expect(result.links[0].start).toBe(6); // After "Visit "
  expect(result.links[0].end).toBe(23);  // After "example.com"
  expect(result.links[0].text).toBe('example.com');
  expect(result.links[0].url).toBe('https://example.com');
});

// Step 2: Implement formatEmailBodyWithLinks
export function formatEmailBodyWithLinks(textBody: string, options: FormatOptions): FormattedEmailBody {
  // Implementation
}

// Step 3: Run tests until they pass
```

---

## Progress Tracking

- [x] T001: Add `formatEmailBodyWithLinks()` with Position Tracking
- [x] T002: Add `renderLineWithLinks()` Helper
- [x] T003: Add `adjustLinksForWrapping()` Helper
- [ ] T004: Integrate Colored Links into EmailDetail Component
- [ ] T005: Integration Tests for End-to-End Flow
- [ ] T006: Final Verification & Polish

---

## Definition of Done

- [ ] All tasks completed
- [ ] All tests passing (428+)
- [ ] No TypeScript errors
- [ ] No build errors
- [ ] Links render in cyan color (or final chosen color)
- [ ] Links clearly visible in both light and dark terminal themes
- [ ] Blank line collapsing still works
- [ ] URL shortening still works
- [ ] Link text from HTML still works
- [ ] Scrolling works correctly with colored links
- [ ] Integration tests cover end-to-end flow
