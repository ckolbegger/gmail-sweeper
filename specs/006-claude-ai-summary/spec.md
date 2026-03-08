# Feature Specification: AI Email Summary

**Feature Branch**: `006-claude-ai-summary`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "When I press the 's' key I want to switch between two views of the email currently selected and shown in the detail view. If the email is in the detailed view, then the 's' key should call the LLM and ask to create a summary formatted as follows: One sentence description of the content of the email followed by a bullet list of action items. The summary should be stored with the email, so the LLM only needs to be called one time for a given email. If the summary view is showing and I press the 's' key, the detail panel should go back to displaying the full email."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate and View AI Summary (Priority: P1)

A user is reading an email in the detail view and wants a quick digest — a one-sentence overview plus a list of things they need to do. They press 's' and the detail panel switches to show that summary. The summary is generated on demand by an AI and then cached so subsequent toggles are instant.

**Why this priority**: This is the core value of the feature. Without it, nothing else exists.

**Independent Test**: Open any email in the detail view, press 's', confirm the panel shows a one-sentence description followed by action-item bullets.

**Acceptance Scenarios**:

1. **Given** an email is selected and the full email is displayed in the detail panel, **When** the user presses 's', **Then** the detail panel replaces the full email content with an AI-generated summary consisting of exactly one sentence describing the email followed by a bullet list of action items.
2. **Given** a summary has never been generated for this email, **When** the user presses 's', **Then** the system requests a summary from the AI service (only once) and displays it when ready.
3. **Given** a summary was previously generated for this email, **When** the user presses 's', **Then** the cached summary is displayed immediately without calling the AI service again.

---

### User Story 2 - Return to Full Email View (Priority: P2)

After reviewing the summary, the user wants to read the full email again. They press 's' and the detail panel switches back to displaying the complete email content.

**Why this priority**: The toggle is only useful if both directions work. Without this, the user is stuck in summary view.

**Independent Test**: With summary view active, press 's', confirm the full email content reappears.

**Acceptance Scenarios**:

1. **Given** the summary view is currently displayed, **When** the user presses 's', **Then** the detail panel switches back to displaying the full email content.
2. **Given** the summary view is currently displayed and the user navigates to a different email and then returns, **When** they press 's', **Then** the toggle behaves correctly based on whichever view was last active for that email.

---

### User Story 3 - Loading Feedback While Summary Generates (Priority: P3)

When the AI is generating a summary for the first time, the user sees a clear indicator that something is happening rather than a blank or frozen panel.

**Why this priority**: Improves perceived quality and prevents users from thinking the feature is broken. Non-blocking to core value.

**Independent Test**: Press 's' on an email with no cached summary and confirm a loading state is visible before the summary appears.

**Acceptance Scenarios**:

1. **Given** no cached summary exists, **When** the user presses 's', **Then** the detail panel immediately shows a loading indicator while the summary is being generated.
2. **Given** the AI service fails or times out, **When** the user presses 's', **Then** the detail panel shows a user-friendly error message and returns to (or remains in) the full email view.

---

### Edge Cases

- What happens when the selected email has no body content (empty email)?
- What happens when the AI service returns a malformed or empty summary?
- What happens when the user presses 's' repeatedly in quick succession while a summary is already being generated?
- What happens when the user switches to a different email while a summary is being generated for the previous one?
- What happens when an email that has a cached summary is archived or deleted — is the cached data cleaned up?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The detail panel MUST support two display modes for a selected email: **full view** (complete email content) and **summary view** (AI-generated digest).
- **FR-002**: Pressing 's' while in full view MUST trigger a transition to summary view.
- **FR-003**: Pressing 's' while in summary view MUST trigger a transition back to full view.
- **FR-004**: The summary MUST consist of exactly one sentence describing the email content, followed by a bullet list of action items derived from the email.
- **FR-005**: The system MUST generate a summary at most once per email — subsequent requests for the same email's summary MUST use the cached result.
- **FR-006**: While a summary is being generated for the first time, the detail panel MUST display a loading indicator.
- **FR-007**: If summary generation fails, the system MUST display a descriptive error message to the user and preserve or restore the full view.
- **FR-008**: The cached summary MUST persist across sessions so that re-opening the application does not require re-generating summaries.
- **FR-009**: The 's' key shortcut MUST only be active when an email is selected and the detail panel is visible; it MUST have no effect otherwise.

### Key Entities

- **Email Summary**: The AI-generated digest for a specific email. Contains a one-sentence description and a list of zero or more action items. Associated with a specific email by its unique identifier. Once created, it is immutable and reused on every subsequent request.
- **Detail Panel View State**: Tracks whether the detail panel is currently in full view or summary view for the currently selected email. Resets to full view when a different email is selected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate and view an AI summary for any email with a single keypress ('s').
- **SC-002**: A summary that has been generated previously is displayed in under 100 milliseconds on subsequent toggles (no perceptible delay).
- **SC-003**: Each email's summary is generated by the AI service exactly once per lifetime of the cached data, regardless of how many times the user toggles the view.
- **SC-004**: Users can return to the full email view from summary view using the same 's' key, with no additional steps.
- **SC-005**: When summary generation fails, the user sees an actionable error message within 30 seconds and is not left in a broken state.

## Assumptions

- The application already has a detail panel that displays the full content of a selected email.
- The application already has an integration with an AI service that can be called with a prompt.
- Summary caching is stored locally on the user's machine (not synced to a server). Clearing local application data clears cached summaries.
- The bullet list of action items may be empty if the email contains no actionable content; the one-sentence description is always present.
- The 's' key shortcut does not conflict with any existing keybindings in the application.
- Summary generation is performed asynchronously so the UI remains responsive during generation.

## Out of Scope

- Editing or regenerating an existing cached summary.
- Sharing or exporting summaries.
- Configuring the summary format or prompt.
- Generating summaries in bulk (e.g., for all emails in the inbox at once).
