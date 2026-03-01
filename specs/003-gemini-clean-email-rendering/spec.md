# Feature Specification: Clean Email Rendering

**Feature Branch**: `003-gemini-clean-email-rendering`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "I would like to tighten up the rendering of email contents in the detail pane. First, I would like any set of blank lines to be collapsed to just two blank lines. Second, I would like all URL's in the email details to be replaced with the text for the link rather than the long https string but never longer than half of the detail window. If I could copy the ful URL from them, or click to opne a browser that would fantastic, but is not a strict requirement."

## Clarifications

### Session 2026-03-01
- Q: How should links in the detail pane be targeted for interaction (opening/copying) within the TUI? → A: Keyboard cycling: Use `Tab` to focus links in the detail pane, and `Enter`/`c` to open/copy.
- Q: Where should the truncation occur when a raw URL exceeds the 50% width limit? → A: End truncation: `https://very-long-url.com/path/...`
- Q: Should link focus mode be "always active" or should the user explicitly enter a "link mode"? → A: Focus Follows Scroll: The link closest to the top of the detail pane is automatically focused.
- Q: How should the currently focused link be visually distinguished from other text? → A: Color Highlight: Change the text color (e.g., to Cyan) or apply a background color to the focused link.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Collapse Excessive Blank Lines (Priority: P1)

A user opens an email that contains many consecutive blank lines (often due to poor formatting or reply chains). Instead of scrolling through multiple empty lines, the user sees at most two blank lines between blocks of text, allowing them to read the actual content more efficiently.

**Why this priority**: This is a core part of "tightening up" the rendering and provides immediate readability improvements.

**Independent Test**: Can be fully tested by opening an email with 3, 5, or 10 consecutive blank lines and verifying that the rendered output only shows exactly 2 blank lines in those spots.

**Acceptance Scenarios**:

1. **Given** an email with 5 consecutive blank lines, **When** viewed in the detail pane, **Then** only 2 blank lines are displayed.
2. **Given** an email with 1 blank line between paragraphs, **When** viewed in the detail pane, **Then** that 1 blank line remains unchanged.
3. **Given** an email with content starting or ending with multiple blank lines, **When** viewed in the detail pane, **Then** those leading/trailing blank lines are also collapsed to at most 2.

---

### User Story 2 - Shorten Long URLs (Priority: P1)

A user views an email containing very long URLs that normally wrap poorly or force horizontal scrolling. The system replaces these long strings with the descriptive text for the link (if available) or a truncated version of the URL. The displayed text never exceeds 50% of the width of the detail window.

**Why this priority**: Long URLs are a major source of layout "looseness" and visual clutter in text-based email readers.

**Independent Test**: Can be fully tested by opening an email with a URL longer than the detail window width and verifying it is replaced by shorter text and does not exceed half the window width.

**Acceptance Scenarios**:

1. **Given** an HTML email with a link like `<a href="https://very-long-url.com/path/to/something">Descriptive Text</a>`, **When** viewed in the detail pane, **Then** "Descriptive Text" is shown instead of the URL.
2. **Given** a plain text email with a raw URL `https://very-long-string-of-characters...`, **When** viewed in the detail pane, **Then** the URL is displayed in a truncated format.
3. **Given** a link with very long descriptive text (exceeding 50% of window width), **When** viewed in the detail pane, **Then** the descriptive text is truncated to fit within 50% of the window width.

---

### User Story 3 - Interactive Links (Priority: P2)

While URLs are visually shortened, the user still needs to access the destination. As the user scrolls through the email content in the detail pane, the link closest to the top of the visible area is automatically focused. The currently focused link is highlighted in Cyan to distinguish it from regular text. The user can also use the `Tab` key to manually override and cycle focus through other visible shortened links. Pressing `Enter` opens the currently focused link in the system browser, and pressing `c` copies the full URL to the clipboard.

**Why this priority**: Prevents the shortening feature from becoming a hindrance to actual email usage.

**Independent Test**: Can be tested by scrolling until a link is at the top of the pane and verifying it is focused (Cyan highlight), or using `Tab` to select a link, then triggering the "Open" (Enter) or "Copy" (c) action.

**Acceptance Scenarios**:

1. **Given** a shortened link is focused in the detail pane, **When** the user presses `Enter`, **Then** the full destination URL is opened in the default web browser.
2. **Given** a shortened link is focused, **When** the user presses `c`, **Then** the full URL is copied to the system clipboard.

---

### Edge Cases

- **Email with only blank lines**: Should result in at most two blank lines being displayed.
- **Malformed URLs**: If a string looks like a URL but is invalid, the system should ideally still attempt to shorten it if it's long, or leave it if it can't be safely parsed as a link.
- **Very narrow detail window**: If the window is only 20 characters wide, the link text must still be restricted to 10 characters, even if the text is short.
- **Link text with newlines**: If the descriptive text itself contains newlines, these should be handled (likely collapsed) to maintain the "tight" rendering.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST collapse any sequence of 3 or more consecutive blank lines into exactly 2 blank lines.
- **FR-002**: System MUST identify both HTML anchor tags and raw text URLs within email content.
- **FR-003**: System MUST replace long URL strings with their associated link text.
- **FR-004**: If no link text is available for a URL (plain text), the system MUST use a truncated version of the URL (end-truncation: `https://domain.com/path/...`) as the display text.
- **FR-005**: System MUST ensure no displayed link text exceeds 50% of the current width of the detail pane.
- **FR-006**: System MUST automatically focus the link closest to the top of the detail pane visible area, highlight it in Cyan, and allow manual cycling via `Tab`.
- **FR-007**: System MUST open the full URL in a web browser when a focused link is activated with `Enter`.
- **FR-008**: System MUST copy the full URL to the system clipboard when a focused link is targeted with `c`.

### Key Entities

- **Email Detail**: The processed content of an email message ready for display.
- **Rendered Link**: A transformed representation of a URL, consisting of "Display Text" and "Destination URL".

## Assumptions

- The system can distinguish between user-intended blank lines and formatting-induced excessive blank lines.
- The system has access to the raw email content (HTML or plain text) to identify URLs and anchor tags.
- The detail pane width is accessible to the rendering logic to calculate the 50% width limit for links.
- "Link text" refers to the content between `<a>` and `</a>` in HTML, or the URL itself in plain text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Vertical space used by excessive blank lines is reduced by at least 30% in affected emails.
- **SC-002**: 100% of lines in the detail pane fit within the horizontal bounds without wrapping long URLs (unless the text itself is very long).
- **SC-003**: Average line length in the detail pane is reduced for emails containing multiple long links.
- **SC-004**: Users can access the full URL destination for 100% of shortened links.
- **SC-005**: Rendering performance remains fast (emails load in under 200ms).
