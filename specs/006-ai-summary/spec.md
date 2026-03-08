# Feature Specification: AI Summary Toggle

**Feature Branch**: `006-ai-summary`  
**Created**: 2026-03-07  
**Status**: Draft  
**Input**: User description: "When I press the 's' key I want to switch between two views of the email currently selected and shown in the detail view. If the email is the detailed view, then the 's' key should call the LLM and ask to create a summary formatted as follows: One sentence description of the content of the email followed by a bullet list of action items. The summary should be stored with the e-mail, so the LLM only needs to be called one time for a given email. If the summary view is showing and I press the 's' key, the detail panel should go back to displaying the full email. Ask any questions you have before we get started. Let's call the feature 'ai summary' and give it feature # 006. Make sure to include the worktree we are in as part of the spec subdirectory and branch name."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Toggle to Summary View (Priority: P1)

User views an email in detail view and presses the 's' key to see an AI-generated summary.

**Why this priority**: This is the primary interaction for the feature - users need to be able to initiate the summary generation by pressing 's' from the detail view.

**Independent Test**: Can be tested by selecting an email in detail view, pressing 's', and verifying a summary is displayed.

**Acceptance Scenarios**:

1. **Given** an email is displayed in detail view, **When** user presses 's' key, **Then** the detail panel switches to show the AI-generated summary
2. **Given** an email has no existing summary, **When** user presses 's' key, **Then** the LLM is called to generate a new summary
3. **Given** an email has an existing summary, **When** user presses 's' key, **Then** the cached summary is displayed (LLM not called again)

---

### User Story 2 - Toggle Back to Detail View (Priority: P1)

User views an email summary and presses 's' key to return to the full email content.

**Why this priority**: Users need to be able to return to the full email content after viewing the summary.

**Independent Test**: Can be tested by viewing a summary and pressing 's' to verify full email content displays.

**Acceptance Scenarios**:

1. **Given** an email summary is displayed, **When** user presses 's' key, **Then** the detail panel returns to showing the full email content

---

### User Story 3 - Summary Format Requirements (Priority: P1)

The AI-generated summary must follow a specific format for consistency and usability.

**Why this priority**: The summary format (one sentence + bullet list) provides quick scanning capability for users to understand email content and identify action items.

**Independent Test**: Can be tested by generating a summary and verifying it contains exactly one sentence description followed by a bulleted list of action items.

**Acceptance Scenarios**:

1. **Given** a summary is generated, **Then** it contains one sentence describing the email content
2. **Given** a summary is generated, **Then** it contains a bullet list of action items identified in the email

---

### Edge Cases

- What happens when LLM fails to generate a summary? (error handling)
- What happens when there's no email selected? (pressing 's' should do nothing)
- What happens with emails that have no actionable content? (summary should still be generated, possibly with empty action items)
- What happens when network is unavailable for LLM call?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to toggle from email detail view to summary view by pressing the 's' key
- **FR-002**: Users MUST be able to toggle from summary view back to detail view by pressing the 's' key
- **FR-003**: System MUST generate summary by calling the LLM when summary does not exist
- **FR-004**: System MUST store the generated summary with the email for persistence
- **FR-005**: System MUST only call LLM once per email (use cached summary on subsequent 's' key presses)
- **FR-006**: Summary MUST contain exactly one sentence describing the email content
- **FR-007**: Summary MUST contain a bullet list of action items identified in the email

### Key Entities

- **Email**: The email being viewed in the detail panel, with associated metadata, content, and cached summary
- **Summary**: AI-generated summary containing one sentence description and list of action items, stored with the email

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can toggle between detail and summary views using the 's' key within 100ms of key press
- **SC-002**: Summary is displayed within 5 seconds of pressing 's' when LLM needs to be called
- **SC-003**: 100% of emails viewed with 's' key display either a cached summary or newly generated summary
- **SC-004**: 95% of generated summaries contain both a one-sentence description and a bulleted list of action items
- **SC-005**: Users can successfully toggle back to full email content from summary view 100% of the time
