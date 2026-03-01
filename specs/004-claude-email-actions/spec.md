# Feature Specification: Email Action Keys — Archive & Delete

**Feature Branch**: `004-claude-email-actions`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "Add two new action keys active in both the list and e-mail detail views. 'e' should archive the current email and remove it from the list being displayed. '#' should delete the current email and remove it from the list being displayed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Archive Email from List View (Priority: P1)

A user reviewing emails in the list view presses `e` on the currently highlighted email to archive it. The email is removed from the displayed list immediately, the cursor moves to the next available email, and the archive operation is applied to the email on the mail server.

**Why this priority**: Archiving is the primary triage action for inbox management — it clears emails without deleting them. This is the most common single-key action expected in keyboard-driven email clients.

**Independent Test**: Can be fully tested by loading the list view with emails, pressing `e`, and verifying the highlighted email disappears from the list while remaining accessible in the archive.

**Acceptance Scenarios**:

1. **Given** the list view is displayed with multiple emails and one is highlighted, **When** the user presses `e`, **Then** the highlighted email is removed from the list, the selection moves to the next email (or previous if it was the last), and the email is archived on the server.
2. **Given** the list view has exactly one email and it is highlighted, **When** the user presses `e`, **Then** the email is removed and the list displays an empty state.
3. **Given** the list view is displayed, **When** the archive operation fails (e.g., network error), **Then** the email remains in the list and a brief error message is shown to the user.

---

### User Story 2 - Delete Email from List View (Priority: P2)

A user reviewing emails in the list view presses `#` on the currently highlighted email to delete (trash) it. The email is removed from the displayed list immediately and moved to trash on the server.

**Why this priority**: Deletion is the second most common triage action. It is slightly lower priority than archive because deleting is irreversible from the user's perspective and archive is the safer default action.

**Independent Test**: Can be fully tested by loading the list view with emails, pressing `#`, and verifying the highlighted email disappears from the list and appears in Trash.

**Acceptance Scenarios**:

1. **Given** the list view is displayed with multiple emails and one is highlighted, **When** the user presses `#`, **Then** the highlighted email is removed from the list, the selection moves to the next email (or previous if it was the last), and the email is moved to Trash on the server.
2. **Given** the list view has exactly one email and it is highlighted, **When** the user presses `#`, **Then** the email is removed and the list displays an empty state.
3. **Given** the list view is displayed, **When** the delete operation fails, **Then** the email remains in the list and a brief error message is shown to the user.

---

### User Story 3 - Archive or Delete from Detail View (Priority: P3)

A user who has opened an email in the detail/preview view presses `e` to archive it or `#` to delete it. The action is applied, the detail view closes, and the email is removed from the list.

**Why this priority**: The detail view is a secondary context — users must be able to act on an email without returning to the list first. This mirrors the behavior of the list view actions for a consistent experience.

**Independent Test**: Can be fully tested by opening the detail view for an email, pressing `e` or `#`, and confirming the view returns to the list with that email absent.

**Acceptance Scenarios**:

1. **Given** the detail view is open for an email, **When** the user presses `e`, **Then** the email is archived on the server, the detail view closes, and the email is absent from the list.
2. **Given** the detail view is open for an email, **When** the user presses `#`, **Then** the email is moved to Trash on the server, the detail view closes, and the email is absent from the list.
3. **Given** the detail view is open and an action fails, **Then** the detail view remains open and an error message is shown.

---

### Edge Cases

- What happens when the user presses `e` or `#` while no email is selected (empty list)? — The key press is ignored.
- What happens when the server request is slow? — The email is removed from the list immediately (optimistic update); if the server call fails, the email is re-inserted and an error is shown.
- What happens when the user presses `e` or `#` while a previous action is still in flight for the same email? — The second key press is ignored until the first operation completes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to press `e` in the list view to archive the currently highlighted email and remove it from the displayed list.
- **FR-002**: Users MUST be able to press `#` in the list view to delete (trash) the currently highlighted email and remove it from the displayed list.
- **FR-003**: Users MUST be able to press `e` in the detail view to archive the currently displayed email, close the detail view, and have that email absent from the list.
- **FR-004**: Users MUST be able to press `#` in the detail view to delete (trash) the currently displayed email, close the detail view, and have that email absent from the list.
- **FR-005**: After an archive or delete action removes an email from the list, the selection MUST automatically move to the next email in the list, or to the previous email if the removed email was the last one.
- **FR-006**: If the list becomes empty after an action, the application MUST display an appropriate empty-state message.
- **FR-007**: If an archive or delete operation fails, the email MUST remain in (or be restored to) the list and a brief, user-readable error message MUST be displayed.
- **FR-008**: The `e` and `#` keys MUST be inactive (no-op) when the email list is empty.

### Key Entities

- **Email**: A displayable item in the list with a unique identifier, used to target server-side archive or delete operations.
- **Email List**: The ordered collection of emails currently shown to the user; updated in-place when emails are acted upon.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can archive or delete an email with a single key press from either the list or detail view, with no additional confirmation steps required.
- **SC-002**: The email disappears from the visible list within one rendering frame of the key press (immediate visual feedback).
- **SC-003**: 100% of archive and delete actions correctly target the email that was highlighted or open at the time the key was pressed.
- **SC-004**: When a server-side action fails, the list state is consistent with what the server reports (no phantom removals persist).

## Assumptions

- The detail/preview view already exists in the application and has a concept of a "currently displayed email."
- The application already has authenticated access to the mail server with sufficient permissions to archive and delete messages.
- No confirmation dialog is required before archiving or deleting (single key press is sufficient).
- Optimistic UI updates (remove from list immediately, revert on failure) are the expected UX pattern, consistent with keyboard-driven email clients like Mutt and Gmail keyboard shortcuts.
- "Delete" means move to Trash, not permanent deletion — permanent deletion is out of scope.
