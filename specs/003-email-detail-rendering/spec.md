# Feature Specification: Email Detail Rendering Improvements

**Feature Branch**: `003-email-detail-rendering`  
**Created**: 2026-02-28  
**Status**: Draft  
**Input**: User description: "I would like to tighten up the rendering of email contents in the detail pane. First, I would like any set of blank lines to be collapsed to just two blank lines. Second, I would like all URLs in the email details to be replaced with the text for the link rather than the long https string but never longer than half of the detail window. If I could copy the full URL from them, or click to open a browser that would fantastic, but is not a strict requirement."

## Clarifications

### Session 2026-02-28

- Q: How should users interact with URLs in the terminal-based detail pane? → A: Keyboard shortcut cycles through URLs, full URL shown in status line

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Collapsed Blank Lines for Better Readability (Priority: P1)

As a user reading emails in the detail pane, I want excessive blank lines to be collapsed so that I can see more email content without unnecessary scrolling.

**Why this priority**: This directly impacts readability and screen real estate efficiency. Emails with poorly formatted whitespace become much harder to read on a terminal screen where vertical space is limited.

**Independent Test**: Can be fully tested by displaying an email with 5+ consecutive blank lines and verifying that only 2 blank lines appear in the rendered output.

**Acceptance Scenarios**:

1. **Given** an email body contains 5 consecutive blank lines, **When** the email is displayed in the detail pane, **Then** only 2 blank lines are shown
2. **Given** an email body contains exactly 2 blank lines, **When** the email is displayed in the detail pane, **Then** the 2 blank lines are preserved as-is
3. **Given** an email body contains no blank lines, **When** the email is displayed in the detail pane, **Then** the content is displayed unchanged
4. **Given** an email body contains multiple groups of blank lines separated by content, **When** the email is displayed in the detail pane, **Then** each group is independently collapsed to 2 blank lines

---

### User Story 2 - Shortened URL Display (Priority: P1)

As a user reading emails in the detail pane, I want long URLs to be displayed as shortened, readable text so that the layout is not broken and I can understand the link context.

**Why this priority**: Long URLs break terminal layouts, cause horizontal scrolling, and make emails unreadable. This is a core usability issue.

**Independent Test**: Can be fully tested by displaying an email containing a long URL (100+ characters) and verifying the displayed text is truncated to half the window width.

**Acceptance Scenarios**:

1. **Given** an email contains a URL longer than half the detail window width, **When** the email is displayed, **Then** the URL text is truncated to fit within half the window width
2. **Given** an email contains a URL shorter than half the detail window width, **When** the email is displayed, **Then** the full URL text is displayed unchanged
3. **Given** an email contains a URL with link text (HTML anchor), **When** the email is displayed, **Then** the link text is displayed instead of the URL, truncated if necessary
4. **Given** an email contains multiple URLs, **When** the email is displayed, **Then** each URL is independently processed according to the display rules

---

### User Story 3 - URL Interaction (Priority: P2)

As a user viewing a shortened URL, I want to be able to access the full URL so that I can copy it or open it in a browser.

**Why this priority**: This is a quality-of-life improvement that enhances the URL display feature but is not critical for basic functionality.

**Independent Test**: Can be tested by pressing the URL cycling shortcut on an email containing URLs and verifying that URLs are highlighted in sequence with the full URL displayed in a status line.

**Acceptance Scenarios**:

1. **Given** a shortened URL is displayed in the detail pane, **When** the user presses the URL cycling keyboard shortcut, **Then** URLs are highlighted in sequence and the full URL is shown in a status line
2. **Given** a URL is highlighted via cycling, **When** the user presses the open shortcut, **Then** the URL opens in the system's default browser
3. **Given** a URL is highlighted via cycling, **When** the user presses the copy shortcut, **Then** the full URL is copied to the system clipboard

---

### Edge Cases

- What happens when the detail pane is resized? URL truncation should update dynamically.
- What happens with URLs that contain Unicode or special characters? They should be handled gracefully without breaking the display.
- What happens with HTML emails that contain complex nested anchor tags? Only the visible text should be affected.
- What happens when an email contains only whitespace? Display should handle gracefully (show minimal content).
- What happens with plain text emails vs HTML emails? Both should be processed consistently.
- What happens when multiple URLs appear on the same line? Each should be independently truncated.
- What happens when a URL is at the edge of a wrapped line? Truncation should account for display width correctly.
- What happens when the URL cycling shortcut is pressed but no URLs exist in the email? System should display a "no URLs" message or do nothing gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST collapse any sequence of 3 or more consecutive blank lines to exactly 2 blank lines
- **FR-002**: System MUST preserve sequences of 1-2 blank lines as-is
- **FR-003**: System MUST detect URLs in email body content (both plain text and HTML-derived text)
- **FR-004**: System MUST truncate displayed URL text to a maximum of half the detail pane width
- **FR-005**: System MUST prefer displaying HTML anchor text over the raw URL when available
- **FR-006**: System MUST visually indicate that a URL has been truncated (e.g., ellipsis, different styling)
- **FR-007**: System SHOULD provide a keyboard shortcut to cycle through URLs in the current email, displaying the full URL in a status line
- **FR-008**: System SHOULD allow copying the currently highlighted URL to clipboard via a keyboard shortcut
- **FR-009**: System SHOULD allow opening the currently highlighted URL in the default system browser via a keyboard shortcut

### Key Entities

- **Email Content Processor**: Component responsible for transforming raw email body text into display-ready format, applying blank line collapsing and URL formatting rules.
- **URL Reference**: Represents a URL in the email content, containing both the full URL and the display text (truncated if necessary).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Emails with 10+ consecutive blank lines display with no more than 2 blank lines in any sequence
- **SC-002**: URLs longer than 50 characters are displayed in a format that does not exceed half the detail pane width
- **SC-003**: Users can read email content without horizontal scrolling caused by long URLs
- **SC-004**: URL display updates correctly when the terminal window is resized
- **SC-005**: 100% of valid URLs in test emails are correctly detected and formatted
- **SC-006**: No non-URL text is incorrectly identified as a URL (zero false positives)

## Assumptions

- The detail pane width is measured in character columns, not pixels
- URLs are detected using standard URL patterns (http://, https://, www., etc.)
- HTML emails are converted to plain text before display (existing behavior)
- The terminal supports Unicode for displaying ellipsis characters
- Clipboard integration is available through the terminal environment
- Browser launching is available through the operating system's default handler

## Out of Scope

- Reformatting or restructuring email content beyond blank line collapsing
- URL validation or security checking
- Click tracking or analytics on URLs
- Custom URL shortening services
- Modifying email content in storage (all changes are display-only)
