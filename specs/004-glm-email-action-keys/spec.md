# Feature Specification: Email Action Keys

**Feature Branch**: `004-glm-email-action-keys`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "Add two new action keys active in both the list and e-mail detail views. 'e' should archive the current email and remove it from the list being displayed. '#' should delete the current email and remove it from the list being displayed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Archive Email with 'e' Key (Priority: P1)

As a user viewing emails in the list or detail view, I want to quickly archive the currently selected email with a single key press so that I can process my inbox efficiently without leaving the keyboard.

**Why this priority**: This is a core productivity feature that enables fast inbox processing. The 'e' key is the standard Gmail shortcut for archive, making it intuitive for users familiar with Gmail.

**Independent Test**: Can be tested by selecting an email and pressing 'e', then verifying the email is archived via Gmail API and removed from the displayed list.

**Acceptance Scenarios**:

1. **Given** an email is selected in the list view, **When** the user presses 'e', **Then** the email is archived in Gmail and removed from the current list display.
2. **Given** an email is displayed in the detail view, **When** the user presses 'e', **Then** the email is archived in Gmail and removed from the list, with selection moving to the next email.
3. **Given** the user presses 'e' with no email selected, **Then** nothing happens and no error is shown.
4. **Given** the archive operation fails, **Then** an error message is displayed and the email remains in the list.

---

### User Story 2 - Delete Email with '#' Key (Priority: P1)

As a user viewing emails in the list or detail view, I want to quickly delete the currently selected email with a single key press so that I can remove unwanted emails from my inbox efficiently.

**Why this priority**: This is a core productivity feature that enables fast inbox processing. The '#' key is the standard Gmail shortcut for delete, making it intuitive for users familiar with Gmail.

**Independent Test**: Can be tested by selecting an email and pressing '#', then verifying the email is moved to trash via Gmail API and removed from the displayed list.

**Acceptance Scenarios**:

1. **Given** an email is selected in the list view, **When** the user presses '#', **Then** the email is moved to trash in Gmail and removed from the current list display.
2. **Given** an email is displayed in the detail view, **When** the user presses '#', **Then** the email is moved to trash in Gmail and removed from the list, with selection moving to the next email.
3. **Given** the user presses '#' with no email selected, **Then** nothing happens and no error is shown.
4. **Given** the delete operation fails, **Then** an error message is displayed and the email remains in the list.

---

### User Story 3 - Selection Navigation After Action (Priority: P2)

As a user, I want the selection to automatically move to the next logical email after archiving or deleting so that I can continue processing emails without manually repositioning.

**Why this priority**: This enhances workflow efficiency but the core action (archive/delete) is functional without it.

**Independent Test**: Can be tested by performing archive/delete on various positions (first, middle, last email) and verifying selection behavior.

**Acceptance Scenarios**:

1. **Given** an email in the middle of the list is selected, **When** the user archives or deletes it, **Then** the next email in the list becomes selected.
2. **Given** the last email in the list is selected, **When** the user archives or deletes it, **Then** the previous email becomes selected.
3. **Given** the only email in the list is selected, **When** the user archives or deletes it, **Then** no email is selected and an empty state is shown.

---

### Edge Cases

- What happens when the Gmail API is unavailable or returns an error?
  - Display error message in status bar, keep email in list
- What happens when the user presses 'e' or '#' while a filter input is active?
  - The key should be ignored (handled by filter input mode)
- What happens when the user presses 'e' or '#' while help panel is shown?
  - The key should be ignored (help panel takes precedence)
- What happens if the email is already archived or deleted remotely?
  - Remove from local list, show success (operation idempotent)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to archive the currently selected email by pressing the 'e' key.
- **FR-002**: System MUST allow users to delete the currently selected email by pressing the '#' key.
- **FR-003**: System MUST remove the archived/deleted email from the displayed list immediately after successful API response.
- **FR-004**: System MUST automatically select the next logical email after an archive/delete action.
- **FR-005**: System MUST display a status message confirming the action (e.g., "Archived 1 email" or "Deleted 1 email").
- **FR-006**: System MUST display an error message if the archive or delete operation fails.
- **FR-007**: System MUST ignore 'e' and '#' keys when filter input mode or help panel is active.
- **FR-008**: System MUST support both list view and detail view contexts for the action keys.

### Key Entities

- **Selected Email**: The email currently highlighted in the list or shown in the detail pane. Identified by `selectedEmailId` in the application state.
- **Displayed Email List**: The current filtered/sorted list of emails shown to the user. Actions modify this list locally after successful API calls.
- **Action Result**: The outcome of archive/delete operations, including success/failure status and count of affected emails.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can archive or delete an email with a single key press from either list or detail view.
- **SC-002**: The email is removed from the displayed list within 500ms of the key press (perceived instant feedback).
- **SC-003**: Selection automatically advances to the next email after action completion.
- **SC-004**: Error states are clearly communicated to the user without crashing the application.
- **SC-005**: Keyboard shortcuts do not conflict with existing navigation or filter functionality.

## Assumptions

- The GmailClient service already provides `archiveEmails()` and `deleteEmails()` methods that handle the Gmail API interactions.
- Users are familiar with Gmail's standard keyboard shortcuts ('e' for archive, '#' for delete).
- No confirmation dialog is required for delete operations (Gmail's trash is recoverable).
- The application has valid Gmail API credentials with modify permissions.
