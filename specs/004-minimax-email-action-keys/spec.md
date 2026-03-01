# Feature Specification: Email Action Keys

**Feature Branch**: `004-minimax-email-action-keys`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "Add two new action keys active in both the list and e-mail detail views. 'e' should archive the current email and remove it from the list being displayed. '#' should delete the current email and remove it from the list being displayed."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Archive Email with 'e' Key (Priority: P1)

As a user viewing emails in the list or detail pane, I want to quickly archive the currently selected email with a single key press so that I can process my inbox efficiently.

**Why this priority**: This is a core productivity feature that enables fast inbox processing. The 'e' key is mnemonic for "archive" or "done".

**Independent Test**: Can be tested by selecting an email and pressing 'e', then verifying the email is archived via Gmail API and removed from the displayed list.

**Acceptance Scenarios**:

1. **Given** an email is selected in the list view, **When** the user presses 'e', **Then** the email is archived in Gmail and removed from the current list.
2. **Given** an email is displayed in the detail view, **When** the user presses 'e', **Then** the email is archived in Gmail and the view returns to the list with the email removed.
3. **Given** the user presses 'e' with no email selected, **Then** nothing happens and no error is shown.

---

### User Story 2 - Delete Email with '#' Key (Priority: P1)

As a user viewing emails in the list or detail pane, I want to quickly delete the currently selected email with a single key press so that I can remove unwanted emails from my inbox.

**Why this priority**: This is a core productivity feature that enables fast inbox processing. The '#' key is a standard convention for delete/trash actions.

**Independent Test**: Can be tested by selecting an email and pressing '#', then verifying the email is trashed via Gmail API and removed from the displayed list.

**Acceptance Scenarios**:

1. **Given** an email is selected in the list view, **When** the user presses '#', **Then** the email is moved to trash in Gmail and removed from the current list.
2. **Given** an email is displayed in the detail view, **When** the user presses '#', **Then** the email is moved to trash in Gmail and the view returns to the list with the email removed.
3. **Given** the user presses '#' with no email selected, **Then** nothing happens and no error is shown.

---

### User Story 3 - Confirmation for Destructive Actions (Priority: P2)

As a user, I want to confirm before permanently deleting an email so that I don't accidentally delete important emails.

**Why this priority**: Deleting email is destructive. While '#' moves to trash (recoverable), users should have confirmation to prevent accidental deletions.

**Independent Test**: Can be tested by pressing '#' and verifying a confirmation prompt appears before the email is deleted.

**Acceptance Scenarios**:

1. **Given** the user presses '#', **When** the confirmation prompt appears, **Then** the user can confirm with 'y' or cancel with 'n' or 'Escape'.
2. **Given** the user confirms the delete, **When** the action proceeds, **Then** the email is moved to trash and removed from the list.
3. **Given** the user cancels the delete, **Then** the email remains in the list and no action is taken.

---

### Edge Cases

- What happens when archive/delete fails due to network error?
- What happens when the email was already archived/deleted on the server?
- What happens if the user presses 'e' or '#' while the list is loading?
- Does the selection move to the next email after archive/delete?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow users to archive the currently selected email by pressing 'e' in both list view and detail view.
- **FR-002**: The system MUST remove archived emails from the displayed list immediately after archiving.
- **FR-003**: The system MUST allow users to delete (move to trash) the currently selected email by pressing '#' in both list view and detail view.
- **FR-004**: The system MUST remove deleted emails from the displayed list immediately after deletion.
- **FR-005**: The system MUST provide a confirmation prompt before executing delete actions.
- **FR-006**: The system MUST handle archive/delete failures gracefully with user-friendly error messages.
- **FR-007**: After archiving or deleting, the system MUST automatically select the next logical email in the list.

### Key Entities _(include if feature involves data)_

- **Selected Email**: The email currently focused in list or detail view that will be acted upon.
- **Action Result**: The outcome of the archive/delete operation (success, failure, confirmation required).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can archive an email with a single key press ('e') and the email is removed from the displayed list within 500ms.
- **SC-002**: Users can delete an email with a single key press ('#') after confirmation, and the email is removed from the displayed list within 500ms.
- **SC-003**: 100% of archive and delete operations succeed without leaving the email in the displayed list.
- **SC-004**: Users can process at least 20 emails per minute using archive ('e') and delete ('#') shortcuts.
- **SC-005**: Zero unintended deletions occur due to the confirmation requirement for '#' actions.

## Assumptions

- The Gmail API is available and authenticated when the user presses these keys.
- "Archive" means moving the email out of INBOX (Gmail's archive action).
- "Delete" means moving the email to the trash folder (recoverable for 30 days).
- The confirmation prompt is a simple y/n prompt in the TUI.
- Network failures should retry once automatically, then show an error if it fails again.
