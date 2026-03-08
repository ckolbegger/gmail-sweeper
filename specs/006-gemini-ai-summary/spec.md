# Feature Specification: AI Summary

**Feature Branch**: `006-gemini-ai-summary`  
**Created**: March 7, 2026  
**Status**: Draft  
**Input**: User description: "When I press the 's' key I want to switch between two views of the email currently selected and shown in the detail view. If the email is the detailed view, then the 's' key should call the LLM and ask to create a summary formatted as follows: One sentence description of the content of the email followed by a bullet list of action items. The summary should be stored with the e-mail, so the LLM only needs to be called one time for a given email. If the summary view is showing and I press the 's' key, the detail panel should go back to displaying the full email. Ask any questions you have before we get started. Let's call the feature "ai summary" and give it feature # 006. Make sure to include the worktree we are in as part of the spec subdirectory and branch name."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate AI Summary (Priority: P1)

As a user viewing an email in the detail view, I want to press the 's' key to instantly generate and view an AI summary of the email's content and action items.

**Why this priority**: Core feature value. This directly allows the user to digest email content faster.

**Independent Test**: Can be fully tested by selecting an unsummarized email, pressing 's', verifying a summary is generated and displayed in the correct format, and verifying the LLM was called.

**Acceptance Scenarios**:

1. **Given** a user is viewing an email in the detail view that has not been summarized before, **When** they press the 's' key, **Then** the LLM is called to generate a summary.
2. **Given** the LLM returns a summary, **When** the summary is ready, **Then** the view switches to the summary view displaying the formatted content (one sentence + bullet points) and the summary is stored.

---

### User Story 2 - Toggle Back to Detail View (Priority: P1)

As a user looking at an email's summary view, I want to press the 's' key to return to the original full email content.

**Why this priority**: Essential navigation. The user must be able to switch back to the original content to read the full context.

**Independent Test**: Can be tested by starting in the summary view, pressing 's', and verifying the view switches back to the full email content.

**Acceptance Scenarios**:

1. **Given** a user is viewing an email in the summary view, **When** they press the 's' key, **Then** the view switches back to the full email detail view.

---

### User Story 3 - View Existing Summary (Priority: P2)

As a user viewing an email that was previously summarized, I want to press the 's' key to instantly see the summary without waiting for the LLM to generate it again.

**Why this priority**: Performance and cost optimization. Prevents redundant LLM calls and provides an instant UI toggle.

**Independent Test**: Can be tested by viewing a previously summarized email, pressing 's', and verifying the summary view appears instantly without any new LLM network calls.

**Acceptance Scenarios**:

1. **Given** a user is viewing an email in the detail view that already has a stored summary, **When** they press the 's' key, **Then** the view switches to the summary view instantly using the stored data, and no LLM call is made.

---

### Edge Cases

- What happens when the LLM service is unavailable, times out, or returns an error?
- How does the system handle an email that is empty or has too little text to summarize meaningfully?
- What happens if the user presses the 's' key multiple times rapidly while the LLM request is still pending?
- How does the system handle emails with content that exceeds the maximum context window of the LLM?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST intercept the 's' keystroke when the email detail view is focused/active.
- **FR-002**: The system MUST maintain a UI state indicating whether the full detail view or the summary view is currently active.
- **FR-003**: The system MUST invoke an LLM service to generate a summary of the currently selected email when 's' is pressed and no prior summary exists for that email.
- **FR-004**: The system MUST instruct the LLM to format the summary strictly as: a single one-sentence description of the content, followed by a bulleted list of action items.
- **FR-005**: The system MUST store the generated summary locally associated with the specific email ID to persist it.
- **FR-006**: The system MUST retrieve and display the stored summary instead of invoking the LLM if a summary already exists for the email.
- **FR-007**: The system MUST switch back to displaying the full email content when 's' is pressed from within the summary view.
- **FR-008**: The system MUST display a loading indicator or state while the LLM request is in progress.
- **FR-009**: The system MUST handle LLM failures gracefully by displaying an appropriate error message and allowing the user to return to the detail view.

### Key Entities

- **EmailSummary**: Represents the AI-generated summary data.
  - Attributes: `emailId` (reference to the original email), `description` (one-sentence overview), `actionItems` (list of strings representing tasks).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can toggle between the full email view and the summary view in under 100 milliseconds when the summary has already been generated.
- **SC-002**: The system makes exactly 1 LLM request per email across multiple view toggles and application sessions.
- **SC-003**: 100% of successfully generated summaries contain exactly one sentence of description and a bulleted list of action items.
- **SC-004**: Error states for LLM failures are displayed within 5 seconds of the failure occurring.
