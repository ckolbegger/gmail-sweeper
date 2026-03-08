# Feature Specification: AI Email Summary

**Feature Branch**: `006-glm-ai-summary`  
**Created**: 2026-03-07  
**Status**: Draft  
**Input**: User description: "When I press the 's' key I want to switch between two views of the email currently selected and shown in the detail view. If the email is the detailed view, then the 's' key should call the LLM and ask to create a summary formatted as follows: One sentence description of the content of the email followed by a bullet list of action items. The summary should be stored with the e-mail, so the LLM only needs to be called one time for a given email. If the summary view is showing and I press the 's' key, the detail panel should go back to displaying the full email."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate and View AI Summary (Priority: P1)

As a user viewing an email in the detail pane, I want to press 's' to generate an AI-powered summary so that I can quickly understand the email's key content and required actions without reading the entire message.

**Why this priority**: This is the core functionality of the feature. It enables users to rapidly process emails by providing immediate value through AI-generated summaries. Users need this capability before any other enhancements.

**Independent Test**: Can be fully tested by selecting an email, pressing 's', and verifying that a summary appears with the correct format (one sentence + bullet list) and that the LLM is called only once per email.

**Acceptance Scenarios**:

1. **Given** an email is displayed in the detail view, **When** the user presses 's' for the first time, **Then** the system calls the configured LLM to generate a summary and displays it in the detail pane.
2. **Given** an email is displayed in the detail view, **When** the user presses 's' and the LLM call is in progress, **Then** a loading indicator is shown in the detail pane.
3. **Given** an email summary has been generated, **When** the user presses 's' again, **Then** the detail pane switches back to showing the full email content.
4. **Given** the detail view is showing a summary, **When** the user presses 's', **Then** the view toggles back to the full email content.
5. **Given** an email has a previously generated summary, **When** the user presses 's', **Then** the summary is displayed immediately without calling the LLM again.

---

### User Story 2 - Summary Format and Content (Priority: P1)

As a user, I want the AI summary to follow a specific format (one sentence description followed by bullet list of action items) so that I can quickly scan and identify required actions.

**Why this priority**: The summary format directly impacts the usability and value of the feature. A consistent, scannable format ensures users can quickly extract actionable information.

**Independent Test**: Can be tested by generating summaries for various emails and verifying that each summary contains exactly one descriptive sentence followed by a bullet list of action items.

**Acceptance Scenarios**:

1. **Given** the LLM generates a summary, **When** the summary is displayed, **Then** it contains exactly one sentence describing the email content.
2. **Given** the LLM generates a summary, **When** the summary is displayed, **Then** it contains a bullet list of action items extracted from the email.
3. **Given** an email has no actionable items, **When** the summary is displayed, **Then** the bullet list may be empty or indicate "No action items identified."

---

### User Story 3 - Persistent Summary Storage (Priority: P2)

As a user, I want generated summaries to be stored permanently so that I don't have to regenerate them when I view the same email again, even after restarting the application.

**Why this priority**: This enhances user experience by preventing redundant LLM calls and costs, but the core functionality (generating summaries) works without persistence.

**Independent Test**: Can be tested by generating a summary, closing the application, reopening it, selecting the same email, pressing 's', and verifying the summary appears immediately without LLM call.

**Acceptance Scenarios**:

1. **Given** a summary has been generated for an email, **When** the user views the same email in a future session, **Then** the stored summary is displayed without calling the LLM.
2. **Given** a summary is stored in the database, **When** the user presses 's', **Then** the summary is retrieved from storage and displayed instantly.

---

### User Story 4 - Error Handling (Priority: P2)

As a user, I want to see clear feedback when the LLM call fails so that I understand why the summary couldn't be generated and can try again or proceed with reading the full email.

**Why this priority**: Error handling is important for user experience but the system remains functional without it (users can still read full emails).

**Independent Test**: Can be tested by simulating an LLM API failure and verifying that an error message is displayed in the status line.

**Acceptance Scenarios**:

1. **Given** the LLM call fails, **When** the error occurs, **Then** an error message is displayed in the status line indicating the failure.
2. **Given** an LLM call has failed, **When** the user presses 's' again, **Then** the system retries the LLM call.
3. **Given** the LLM call fails, **When** the error is displayed, **Then** the detail pane continues showing the full email content.

---

### Edge Cases

- What happens when the user presses 's' while the filter input is active?
  - The key should be ignored (handled by filter input mode)
- What happens when the user presses 's' while the help panel is shown?
  - The key should be ignored (help panel takes precedence)
- What happens when no email is selected in the detail view?
  - The 's' key should do nothing (no summary to generate)
- What happens when the email body is empty or contains only whitespace?
  - The LLM should still be called with the available metadata (subject, sender, snippet)
- What happens when the LLM returns a malformed summary (missing sentence or bullets)?
  - Display the raw LLM response with a note that the format may be incomplete
- What happens when the LLM call times out?
  - Display a timeout error message and allow retry
- What happens when the database is unavailable for storing/retrieving summaries?
  - Display an error message and continue with in-memory caching for the current session
- What happens when the user switches between emails rapidly while a summary is generating?
  - The in-progress LLM call should complete but its result should be discarded if the user has moved to a different email
- What happens when the configured AI provider is unavailable (no API key)?
  - Display an error message indicating the AI provider is not configured

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to toggle between full email view and AI summary view by pressing the 's' key when an email is displayed in the detail pane.
- **FR-002**: System MUST call the configured LLM provider (Anthropic or OpenAI) to generate a summary when the user presses 's' for the first time on an email.
- **FR-003**: System MUST display a loading indicator while the LLM is generating the summary.
- **FR-004**: System MUST generate summaries in the format: one sentence description of email content followed by a bullet list of action items.
- **FR-005**: System MUST store generated summaries in the database so they persist across application restarts.
- **FR-006**: System MUST retrieve stored summaries from the database instead of calling the LLM when a summary already exists for an email.
- **FR-007**: System MUST display error messages in the status line when LLM calls fail.
- **FR-008**: System MUST allow users to retry failed summary generation by pressing 's' again.
- **FR-009**: System MUST ignore 's' key presses when filter input mode or help panel is active.
- **FR-010**: System MUST cancel in-progress LLM calls if the user navigates away from the email before completion.
- **FR-011**: System MUST use the existing AI provider configuration (AI_PROVIDER, AI_API_KEY environment variables).

### Key Entities

- **Email Summary**: AI-generated summary of an email, consisting of a one-sentence content description and a list of action items. Stored permanently in the database and associated with a specific email ID.
- **Summary Generation State**: Tracks whether a summary is currently being generated (loading), has been generated successfully, or failed for the currently selected email.
- **AI Provider Configuration**: Existing configuration that specifies which LLM service to use (Anthropic/OpenAI), API credentials, and model selection. Reused from the smart filter feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate an email summary with a single key press from the detail view.
- **SC-002**: Summaries are generated within 5 seconds for 95% of emails under normal network conditions.
- **SC-003**: Users can view a previously generated summary instantly (under 100ms) without calling the LLM.
- **SC-004**: 100% of generated summaries follow the specified format (one sentence + bullet list).
- **SC-005**: LLM is called exactly once per email, regardless of how many times the user views it.
- **SC-006**: Error states are clearly communicated to users without crashing the application.
- **SC-007**: Users can successfully retry failed summary generation.
- **SC-008**: Keyboard shortcut 's' does not conflict with existing navigation or filter functionality.

## Assumptions

- The existing AI provider infrastructure (from feature 002-smart-email-filter) will be reused for summary generation.
- The LLM will reliably generate summaries in the requested format when provided with appropriate prompts.
- Email summaries are relatively small (under 500 characters) and can be stored in a TEXT column in the database.
- Users have valid AI provider credentials configured via environment variables.
- The database migration system will handle adding the summary column without data loss.
- Summary generation is a user-initiated action and will not be performed automatically in the background.
- Users understand that AI-generated summaries may not always be 100% accurate and should verify critical information in the full email.

## Out of Scope

- Automatic summary generation for all emails (user must press 's' to trigger)
- Summary regeneration or refresh functionality
- Editing or manually correcting AI-generated summaries
- Sharing summaries between users
- Summary analytics or quality metrics
- Alternative summary formats or user-customizable formats
- Summary generation for email threads (only individual emails)
- Caching summaries in memory beyond the current session (database is the source of truth)
- Rate limiting or quota management for LLM API calls
