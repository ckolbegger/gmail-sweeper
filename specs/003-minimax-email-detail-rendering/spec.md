# Feature Specification: Email Detail Rendering Improvements

**Feature Branch**: `003-minimax-email-detail-rendering`  
**Created**: 2026-02-28  
**Status**: Draft  
**Input**: User description: "I would like to tighten up the rendering of email contents in the detail pane. First, I would like any set of blank lines to be collapsed to just two blank lines. Second, I would like all URL's in the email details to be replaced with the text for the link rather than the long https string but never longer than half of the detail window. If I could copy the ful URL from them, or click to opne a browser that would fantastic, but is not a strict requirement."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Collapsed Blank Lines in Email Content (Priority: P1)

As a user viewing an email in the detail pane, I want excessive blank lines to be automatically collapsed so that the email content displays more cleanly without wasted vertical space.

**Why this priority**: This is a core rendering improvement that directly affects how users read every email. Long strings of blank lines create unnecessary scrolling and make email content harder to scan.

**Independent Test**: Can be tested by opening emails with multiple consecutive blank lines and verifying they display with at most 2 blank lines between content blocks.

**Acceptance Scenarios**:

1. **Given** an email contains 5 consecutive blank lines, **When** the email is displayed in the detail pane, **Then** only 2 blank lines are visible.
2. **Given** an email contains a single blank line between paragraphs, **When** the email is displayed, **Then** that single blank line is preserved.
3. **Given** an email contains 10+ consecutive blank lines (e.g., at the end of quoted content), **When** displayed, **Then** they are reduced to exactly 2 blank lines.

---

### User Story 2 - URL Display as Link Text (Priority: P1)

As a user viewing an email with URLs, I want long HTTPS links to be displayed as readable link text instead of the full URL string, so that the email content is easier to read and looks cleaner.

**Why this priority**: This is a core usability improvement. Long URLs (often 50-200+ characters) clutter the display and make emails difficult to read. Users can still access the full URL through additional interactions.

**Independent Test**: Can be tested by viewing emails containing long HTTPS URLs and verifying they display as clickable link text with reasonable length.

**Acceptance Scenarios**:

1. **Given** an email contains a URL like `https://example.com/some/very/long/path?param1=value1&param2=value2`, **When** displayed in the detail pane, **Then** it shows as readable link text instead of the full URL.
2. **Given** an email contains a URL, **When** the rendered link text would exceed half the detail window width, **Then** the link text is truncated to half the window width with an indicator (e.g., "...").
3. **Given** an email contains multiple URLs, **When** displayed, **Then** each URL is rendered as separate link text.

---

### User Story 3 - Copy URL to Clipboard (Priority: P2)

As a user viewing an email with URLs, I want to be able to copy the full URL to my clipboard so that I can paste it elsewhere without having to manually type or select the entire long URL.

**Why this priority**: This is a quality-of-life enhancement. After seeing truncated link text, users need a way to access the complete URL. This makes the feature practical rather than just visual.

**Independent Test**: Can be tested by right-clicking or using a copy button on a displayed URL link and verifying the full URL is available in the clipboard.

**Acceptance Scenarios**:

1. **Given** an email contains a URL that is displayed as truncated link text, **When** the user copies the link, **Then** the full original URL (not the truncated text) is copied to the clipboard.
2. **Given** an email contains a URL displayed as link text, **When** the user initiates a copy action, **Then** the user receives visual feedback that the URL was copied.

---

### User Story 4 - Click to Open URL in Browser (Priority: P3)

As a user viewing an email with URLs, I want to be able to click on the link text to open the URL in my browser so that I can quickly access the linked content.

**Why this priority**: This is an optional convenience feature that makes URLs actionable directly from the email view, improving user workflow.

**Independent Test**: Can be tested by clicking on a displayed URL link and verifying the browser opens with the correct destination.

**Acceptance Scenarios**:

1. **Given** an email contains a URL displayed as link text, **When** the user clicks the link, **Then** the browser opens to the full URL destination.
2. **Given** an email contains multiple URLs, **When** the user clicks on different link texts, **Then** each opens its respective URL in the browser.

---

### Edge Cases

- What happens when an email contains only a URL with no surrounding text?
- How are URLs in HTML emails vs plain text emails handled differently?
- What happens when the detail pane is resized - does the truncated link text adjust dynamically?
- How are malformed or incomplete URLs (e.g., missing protocol) handled?
- What happens when the email contains data URIs or non-http URLs (ftp, mailto, tel)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render email content in the detail pane with no more than 2 consecutive blank lines between any content blocks.
- **FR-002**: The system MUST display all HTTP/HTTPS URLs in email content as clickable link text rather than the full URL string.
- **FR-003**: The system MUST truncate link text to no longer than 50% of the detail pane width, adding visual truncation indicators when necessary.
- **FR-004**: Users MUST be able to copy the full original URL (not truncated text) to their clipboard from any displayed link.
- **FR-005**: The system MUST provide visual feedback when a URL is successfully copied to the clipboard.
- **FR-006**: Users MUST be able to click on displayed link text to open the URL in their default browser. *(P3 - Nice to have)*

### Key Entities *(include if feature involves data)*

- **Email Content**: The body content of an email being displayed in the detail pane, which may include text, URLs, and formatting.
- **Displayed Link**: A URL rendered as clickable link text in the email detail view, potentially truncated for display.
- **Original URL**: The complete URL string from the email content, preserved for clipboard copy and browser opening actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can read email content in the detail pane without seeing more than 2 consecutive blank lines between content blocks.
- **SC-002**: Users see all URLs displayed as readable link text, with no visible URLs exceeding half the detail pane width.
- **SC-003**: 100% of copied URLs contain the complete original URL, verified by copying a truncated link and comparing to the source.
- **SC-004**: Users can successfully open any URL from the email detail pane by clicking the link text. *(P3)*
- **SC-005**: Users report improved readability of email content in the detail pane, with reduced visual clutter from long URLs and excessive blank lines.

## Assumptions

- The detail pane has a defined width that can be used to calculate the 50% truncation limit.
- Email content may come from both plain text and HTML email formats.
- URL detection should identify http://, https://, and potentially www. prefixes.
- The truncation calculation accounts for the full link element including any truncation indicator characters.
