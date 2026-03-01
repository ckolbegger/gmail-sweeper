# Feature Specification: Email Detail Rendering Improvements

**Feature Branch**: `003-email-rendering`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Tighten up rendering of email contents in the detail pane: collapse excessive blank lines and replace long URLs with readable link text, truncated to half of detail pane width; copy/open URL is optional."

## Clarifications

### Session 2026-02-28

- Q: How many consecutive blank lines should be preserved in rendered email detail content? → A: At most two blank lines.
- Q: Is URL copy or browser-open interaction required for this feature? → A: No, it is desired but not a strict requirement.
- Q: What is the maximum displayed length for link text in the detail pane? → A: Never longer than half of the detail pane width.
- Q: What display text should replace URLs? → A: Use anchor text when available; otherwise use hostname.
- Q: Should trailing punctuation be part of detected URLs? → A: No; exclude trailing punctuation from URL matches.
- Q: How should half-width truncation be calculated? → A: Use floor(width/2), minimum 12 chars, with ellipsis included in cap.
- Q: What counts as a blank line and where should collapsing apply? → A: Whitespace-only lines are blank; collapse all runs including leading/trailing to max two.
- Q: Is full URL mapping persistence required in this story? → A: No; defer mapping persistence requirement to a future enhancement.

### Session 2026-02-28 (Anchor Source Strategy)

- Q: Should anchor text use HTML parsing even when text/plain exists? → A: Yes; use HTML-first merge and prefer HTML anchor text for matching URLs.
- Q: Where should anchor extraction happen? → A: In TUI rendering layer.
- Q: Should HTML content be exposed to TUI? → A: Yes; include decoded `html_body` in detail payload.
- Q: How should URL matching normalize? → A: Strip all query params, ignore fragments, ignore default ports, normalize case/trailing slash.
- Q: If one anchor text ambiguously maps across URLs, what should happen? → A: Fall back to hostname for ambiguous group.
- Q: If multiple anchors map to same normalized URL, which text wins? → A: First in document order.
- Q: Which link schemes are eligible for anchor mapping? → A: `http`/`https` only.
- Q: Should entities/whitespace in anchor text be normalized? → A: Yes; decode entities, trim, collapse internal whitespace.
- Q: If normalized anchor text is empty, what should happen? → A: Fall back to hostname.
- Q: Should generic anchor text be allowed? → A: Yes.
- Q: How should oversized or unparsable HTML behave? → A: If parse fails or HTML >1 MB, skip extraction silently and fall back.
- Q: Should there be caching now? → A: No, no caching in current scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Readable Email Body Formatting (Priority: P1)

As a user reading an email in the detail pane, I want excessive vertical whitespace normalized so I can scan content quickly without scrolling through large blank gaps.

**Why this priority**: This directly improves readability for every message and reduces visual noise in the primary reading workflow.

**Independent Test**: Can be tested by rendering email bodies with 3+ consecutive blank lines and verifying output never exceeds two blank lines in a row.

**Acceptance Scenarios**:

1. **Given** an email body with single and double blank lines, **When** the detail pane renders it, **Then** existing spacing is preserved.
2. **Given** an email body containing three or more consecutive blank lines, **When** the detail pane renders it, **Then** each run is collapsed to exactly two blank lines.
3. **Given** a mixed-content email with headings, paragraphs, and signatures, **When** rendered, **Then** text order and non-blank content are unchanged.

---

### User Story 2 - Human-Readable Link Display (Priority: P1)

As a user reading email details, I want long raw URLs displayed as short readable link text so the pane is easier to read and less dominated by long `https://...` strings.

**Why this priority**: Long URLs make detail content noisy and harder to scan, especially in narrow terminal panes.

**Independent Test**: Can be tested by rendering messages that include long URLs and verifying displayed link text replaces raw URLs and is capped at half pane width.

**Acceptance Scenarios**:

1. **Given** an email body containing one or more raw URLs, **When** the detail pane renders it, **Then** each URL is replaced with readable link text (anchor text when available; otherwise hostname) instead of the full raw URL.
2. **Given** a URL whose readable text would exceed half the detail pane width, **When** rendered, **Then** the displayed text is truncated to `floor(width/2)` characters (minimum 12), with ellipsis counted inside the cap.
3. **Given** an email body with no URLs, **When** rendered, **Then** content is displayed without link substitution side effects.
4. **Given** both plain-text and HTML representations for a link, **When** normalized URLs match, **Then** HTML anchor text is used as display text.

---

### User Story 3 - Optional Link Actions (Priority: P2)

As a user, I may want to copy the full URL or open it in a browser from the detail pane so I can act on links quickly.

**Why this priority**: Useful usability enhancement, but not required to deliver the core readability improvement.

**Independent Test**: Can be tested independently if implemented; absence of this behavior does not block P1 stories.

**Acceptance Scenarios**:

1. **Given** rendered link text in the detail pane, **When** optional link interaction is implemented, **Then** the user can retrieve the original full URL for copy and/or open.

---

### Edge Cases

- Email body contains mixed line endings (`\n`, `\r\n`) and still requires consistent blank-line collapsing.
- URLs include trailing punctuation such as `)` or `.` and parser should avoid incorrect truncation or capture.
- Multiple URLs appear on one line and each should be rendered safely and independently.
- Very narrow detail pane widths still enforce the half-width cap without producing empty link text.
- Malformed URL-like strings should not break rendering or crash the detail view.
- HTML anchor extraction input exceeds 1 MB and should be skipped with silent fallback behavior.
- HTML parse failures should not surface user-visible errors and should fall back to hostname-based display behavior.
- Relative HTML links should only resolve via `<base>`; unresolved relatives are ignored for anchor mapping.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST normalize rendered email body whitespace so that no run of blank lines exceeds two consecutive blank lines.
- **FR-001a**: System MUST treat lines containing only whitespace as blank lines.
- **FR-001b**: System MUST apply blank-line collapsing to all runs, including leading and trailing runs.
- **FR-002**: System MUST preserve non-blank textual content order and wording during whitespace normalization.
- **FR-003**: System MUST detect URLs in rendered email detail content and display readable link text instead of full raw URL strings, using anchor text when available and hostname otherwise.
- **FR-003b**: System MUST prefer HTML-derived anchor text over plain-text-derived labels when both map to the same normalized URL.
- **FR-003c**: System MUST expose decoded HTML body content in email detail payloads for rendering-layer anchor extraction.
- **FR-003d**: System MUST apply anchor extraction only to `http://` and `https://` links.
- **FR-003e**: System MUST resolve relative HTML links only via `<base>` and ignore unresolved relative links for anchor mapping.
- **FR-003f**: System MUST skip HTML anchor extraction and silently fall back to hostname behavior when HTML parsing fails.
- **FR-003g**: System MUST skip HTML anchor extraction when decoded HTML body size exceeds 1 MB and silently fall back to hostname behavior.
- **FR-003h**: System MUST decode HTML entities in anchor text and normalize whitespace by trimming and collapsing internal spaces.
- **FR-003i**: System MUST fall back to hostname when normalized anchor text is empty.
- **FR-003j**: System MUST allow generic anchor text labels as valid display text.
- **FR-003k**: System MUST use first anchor occurrence in document order when multiple anchors map to the same normalized URL.
- **FR-003l**: System MUST fall back to hostname when one anchor text ambiguously maps to multiple normalized URLs.
- **FR-003m**: URL matching for HTML/plain reconciliation MUST normalize by stripping query params, ignoring fragments, ignoring default ports, and normalizing scheme/host case with trailing-slash normalization.
- **FR-003n**: System MUST perform HTML anchor extraction in the TUI rendering layer.
- **FR-003o**: System is NOT REQUIRED to cache anchor extraction results in current scope.
- **FR-003a**: System MUST exclude trailing punctuation (`.`, `,`, `;`, `:`, `!`, `?`, `)`, `]`) from URL matches used for replacement.
- **FR-004**: System MUST cap displayed link text length to no more than `floor(detailPaneWidth / 2)` characters.
- **FR-004a**: System MUST enforce a minimum displayed link token cap of 12 characters for narrow panes.
- **FR-004b**: When truncation is applied, ellipsis MUST count toward the link token cap.
- **FR-005**: System MUST keep rendering stable for emails with zero, one, or many URLs without errors.
- **FR-006**: System MUST continue to render messages that contain malformed or non-standard URL-like strings without crashing.
- **FR-007**: System is NOT REQUIRED to persist a mapping between rendered link text and original full URLs in current scope.
- **FR-008**: System MAY provide explicit link interactions (copy full URL and/or open browser) as a non-blocking enhancement.

### Key Entities

- **Detail Pane Width**: The effective character width of the right-hand email detail panel used to determine truncation limits.
- **Rendered Link Token**: A display-safe, human-readable representation of a URL shown in place of the raw URL string, derived from anchor text when available or hostname otherwise.
- **HTML Body (Decoded)**: The decoded HTML message body provided to rendering logic exclusively for anchor extraction and reconciliation.
- **Normalized URL Key**: Canonical URL representation used to match links across plain-text and HTML sources.
- **Original URL Value (Optional Future)**: The full URL string extracted from email content for potential future copy/open interactions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In test fixtures containing 3+ consecutive blank lines, rendered output has zero occurrences of more than two consecutive blank lines.
- **SC-002**: In test fixtures containing long URLs, 100% of displayed link tokens are at or below `floor(configuredPaneWidth / 2)` characters, with a minimum cap of 12.
- **SC-003**: Rendering function completes without exceptions for mixed-content fixture set including malformed URL-like strings.
- **SC-004**: Readability review on terminal snapshots shows no unbroken long URL string dominates a line in the detail pane.
- **SC-005**: In fixtures where plain-text and HTML labels differ for the same normalized URL, 100% of rendered labels use HTML anchor text.
- **SC-006**: In oversized/parsing-failure HTML fixtures, rendering succeeds with silent fallback and no user-visible error message.

## Assumptions

- The detail pane renderer has access to the effective pane width (or a deterministic width used for formatting decisions).
- Existing detail rendering architecture allows a preprocessing step before lines are displayed.
- URL replacement is limited to display output and does not mutate stored source email content.
- Decoded HTML body can be made available in detail payloads without changing existing user-visible non-rendering behavior.

## Dependencies

- US3 detail pane flow from `001-smart-inbox-organizer` remains the host surface for this enhancement.
- Existing email detail retrieval and decoding continue to provide plain text body content and will also provide decoded HTML content for rendering-layer reconciliation.

## Out of Scope

- Full rich-text/HTML rendering parity for all email clients.
- Interactive mouse-driven link navigation.
- Guaranteed clipboard integration across all terminal environments.
- Persistent rendered-link to full-URL mapping as a required capability in this story.
- In-memory caching of per-message anchor extraction results.
