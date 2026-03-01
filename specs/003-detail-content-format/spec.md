# Feature Specification: Detail Pane Content Formatting

**Feature Branch**: `003-detail-content-format`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "I would like to tighten up the rendering of email contents in the detail pane. First, I would like any set of blank lines to be collapsed to just two blank lines. Second, I would like all URL's in the email details to be replaced with the text for the link rather than the long https string but never longer than half of the detail window. If I could copy the full URL from them, or click to open a browser that would be fantastic, but is not a strict requirement."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Blank Line Collapse (Priority: P1)

When reading an email in the detail pane, the user sees compact, readable content without excessive vertical whitespace. Multiple consecutive blank lines are reduced to a maximum of two blank lines, keeping related content visually grouped without wasting screen space.

**Why this priority**: Excessive blank lines are a common problem in email content and directly harm readability. This is a pure rendering transformation with no interaction required, making it the simplest and highest-value fix.

**Independent Test**: Open an email with 3+ consecutive blank lines and verify the detail pane renders no more than 2 consecutive blank lines at any point.

**Acceptance Scenarios**:

1. **Given** an email body containing 3 or more consecutive blank lines, **When** the email is displayed in the detail pane, **Then** those blank lines are collapsed to exactly 2 blank lines
2. **Given** an email body containing exactly 1 or 2 consecutive blank lines, **When** the email is displayed in the detail pane, **Then** those blank lines are preserved as-is
3. **Given** an email body with no blank lines, **When** displayed, **Then** the content is unchanged

---

### User Story 2 - URL Display Truncation (Priority: P2)

When reading an email containing hyperlinks or raw URLs, the user sees readable link text (or a shortened URL) instead of long, unwieldy `https://...` strings. The displayed text is never wider than half the detail pane width.

**Why this priority**: Long URLs break visual flow and make emails harder to scan. Replacing them with meaningful link text dramatically improves readability. This is the core UX improvement requested.

**Independent Test**: Open an email containing long URLs and verify each is rendered as either its link text or a truncated representation, never exceeding half the pane width.

**Acceptance Scenarios**:

1. **Given** an email containing an HTML anchor with link text (e.g., `<a href="https://...">Click here</a>`), **When** displayed in the detail pane, **Then** the display shows the link text ("Click here") rather than the raw URL
2. **Given** an email containing a raw URL with no associated link text, **When** displayed, **Then** the URL is truncated to fit within half the current detail pane width
3. **Given** a URL whose link text exceeds half the detail pane width, **When** displayed, **Then** the link text is truncated with an ellipsis to fit within half the pane width
4. **Given** the detail pane is resized, **When** an email with URLs is displayed, **Then** URL/link text truncation respects the new pane width

---

### User Story 3 - URL Interaction (Priority: P3)

When a user wants to act on a displayed URL (copy it or open it in a browser), they can do so without losing the original full URL. This is a quality-of-life enhancement on top of the display improvement.

**Why this priority**: Nice-to-have interaction layer. The display improvement (P2) delivers value independently; interaction is additive.

**Independent Test**: Navigate focus to a URL in the detail pane, press the copy key, and verify the full URL is on the clipboard; press the open key and verify the browser opens.

**Acceptance Scenarios**:

1. **Given** a URL is focused in the detail pane, **When** the user presses the copy key, **Then** the full original URL is placed on the clipboard
2. **Given** a URL is focused in the detail pane, **When** the user presses the open key, **Then** the default system browser opens the full original URL
3. **Given** a URL is visible but not focused, **When** the user presses Tab (forward) or Shift-Tab (backward), **Then** focus moves to the next/previous URL in the email body
4. **Given** focus is on the last URL and the user presses Tab, **When** no more URLs follow, **Then** focus wraps to the first URL (or exits URL focus)

---

### Edge Cases

- What happens when an email contains only blank lines (empty body)? Display as empty or minimal whitespace.
- How does the system handle a URL that is already shorter than half the pane width? Show it as-is, no truncation needed.
- How are `mailto:` and other non-http(s) schemes handled? Treat identically to https URLs unless specified otherwise.
- What if link text itself is entirely whitespace or empty? Fall back to displaying the raw URL (truncated if needed).
- What if the detail pane is very narrow (e.g., less than 20 characters wide)? Apply truncation to half of whatever width is available; minimum display of at least a few characters plus ellipsis.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The detail pane MUST collapse any run of 3 or more consecutive blank lines to exactly 2 blank lines before rendering
- **FR-002**: The detail pane MUST display link text in place of raw URLs when link text is available (HTML anchor tags in HTML emails); for plain-text emails with bare URLs, no substitution is attempted — the URL is truncated only
- **FR-003**: The detail pane MUST truncate any displayed URL or link text to no more than half the current detail pane width, appending an ellipsis when truncated
- **FR-004**: The full original URL MUST be preserved internally even when the display is shortened or replaced with link text
- **FR-005**: URL display truncation MUST respond to changes in detail pane width (dynamic, not computed once at load)
- **FR-006**: Users SHOULD be able to copy the full original URL to the clipboard by pressing a dedicated key while the URL is focused in the detail pane (non-mandatory enhancement)
- **FR-007**: Users SHOULD be able to open the full original URL in the system default browser by pressing a dedicated key while the URL is focused in the detail pane (non-mandatory enhancement)
- **FR-008**: URLs in the detail pane SHOULD be individually focusable via Tab (forward) and Shift-Tab (backward) navigation, cycling through all URLs in the email body (non-mandatory enhancement; required for FR-006/FR-007 to function)

### Key Entities

- **EmailBody**: The raw content of an email as displayed in the detail pane — may contain HTML, plain text, or a mix
- **DisplayedURL**: A URL shown in the detail pane — has a display representation (truncated/text-substituted) and a full original URL preserved internally
- **DetailPane**: The UI panel rendering the email body — has a measurable character width used for truncation calculations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Emails with excessive whitespace display with no more than 2 consecutive blank lines in the detail pane, in 100% of cases
- **SC-002**: All raw URLs longer than half the detail pane width are replaced with link text or truncated — no raw URL overruns the half-width boundary
- **SC-003**: The full original URL is accessible (via copy or open) for every displayed link, with no data loss
- **SC-004**: Detail pane URL truncation updates correctly when the pane is resized without requiring the user to reload the email

## Assumptions

- The detail pane renders email content as plain text or lightly formatted text (not a full HTML browser renderer); URL extraction operates on the text/HTML source available to the app
- "Half of the detail window" means half the character width of the detail pane at the time of rendering
- Blank line collapsing applies to the rendered output, not the raw email source stored/fetched
- `mailto:` and other non-http(s) URL schemes are treated the same as https URLs for display purposes unless determined otherwise during implementation
- Link text availability is determined from HTML anchor tags in the email source; plain-text emails with bare URLs have no associated link text — bare URLs in plain-text bodies are truncated only, not substituted
- When link text is available, it is preferred over the URL regardless of length (subject to the half-width cap)
- When an email provides both a plain-text body and an HTML body, the plain-text body is used for display; URL processing follows the plain-text path (truncation only, no anchor extraction)

## Clarifications

### Session 2026-02-28

- Q: How should bare URLs in plain-text emails (no HTML anchors) be handled — truncate only, skip entirely, or resolve link text via network? → A: Truncate only; no substitution attempted for plain-text emails
- Q: How does the user trigger copy/open on a URL — keypress while focused, selectable list with Enter, or context menu? → A: Dedicated keypress while URL is focused (e.g., `c` to copy, `o` to open)
- Q: How does the user navigate between multiple URLs in an email — dedicated mode with arrows, Tab/Shift-Tab directly, or numbered selection? → A: Tab/Shift-Tab cycles through URLs directly, no mode switch required
