# Feature Specification: Smart Inbox Organizer

**Feature Branch**: `claude`
**Created**: 2026-01-31
**Status**: Draft
**Input**: User description: "Smart Inbox Organizer - Gmail organization tool with natural language rules engine"

## Architecture & Delivery Phases

### Frontend Strategy

- **TUI MVP (Phase 1)**: Terminal user interface with keyboard navigation (vim-style j/k, arrow keys, Enter to select/execute)
- **TUI Fast Follow (Phase 2)**: Saved Queries & Workflows added to TUI
- **Web App Fast Follow**: Local web app (localhost only) for non-CLI users

### Core Architecture

The backend and business logic MUST be frontend-agnostic to support both TUI and web interfaces:
- Shared core library handles Gmail integration, natural language processing, and email actions
- TUI and web app are thin presentation layers consuming the shared core
- No business logic in frontend code

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Browse Inbox (Priority: P1) — TUI MVP

A user opens the application and sees their Gmail inbox displayed as a list of emails. The list shows emails sorted by date (newest first) by default. Unread emails appear in bold to stand out. The user navigates with arrow keys or vim-style keys (j/k) and presses Enter to view an email's full contents in an adjacent preview pane.

**Why this priority**: This is the foundational experience - users must be able to see and read their emails before any other features become useful.

**Independent Test**: Can be fully tested by connecting a Gmail account and verifying the inbox loads with proper sorting, bold formatting for unread, and keyboard navigation works.

**Acceptance Scenarios**:

1. **Given** a user has connected their Gmail account, **When** they open the application, **Then** they see a list of their inbox emails sorted by date descending (newest first)
2. **Given** the inbox list is displayed, **When** an email is unread, **Then** that email row appears in bold text
3. **Given** the inbox list is displayed, **When** the user navigates to an email (j/k or arrow keys) and presses Enter, **Then** the email contents appear in the preview pane
4. **Given** the user is viewing an email, **When** they navigate to a different email and press Enter, **Then** the preview pane updates to show the newly selected email

---

### User Story 2 - Filter and Sort Emails (Priority: P1) — TUI MVP

A user wants to narrow down their inbox view. They can sort the email list by sender, date, label, or category. They can also filter to show only emails matching specific criteria (e.g., only emails from a specific sender, only emails with a certain label). Sorting and filtering are accessed via keyboard shortcuts or command input.

**Why this priority**: Basic filtering and sorting enables users to manually find emails, which is essential before introducing the natural language search.

**Independent Test**: Can be fully tested by applying different sort orders and filters, verifying the list updates correctly.

**Acceptance Scenarios**:

1. **Given** the inbox is displayed, **When** the user selects "Sort by Sender", **Then** emails are grouped/sorted alphabetically by sender
2. **Given** the inbox is displayed, **When** the user selects "Sort by Date Ascending", **Then** emails appear oldest first
3. **Given** the inbox is displayed, **When** the user filters by a specific label, **Then** only emails with that label are shown
4. **Given** the inbox is displayed, **When** the user filters by category, **Then** only emails in that category are shown
5. **Given** filters are applied, **When** the user clears the filters, **Then** the full inbox list is restored

---

### User Story 3 - Natural Language Email Search (Priority: P1) — TUI MVP

A user wants to find emails matching a conceptual description rather than exact keywords. They enter a natural language query like "Find all emails that are financial offers" or "Find emails about upcoming events." The system interprets this query and displays only matching emails.

**Why this priority**: This is the "magic feature" that differentiates the application - semantic understanding of email content beyond simple keyword matching.

**Independent Test**: Can be fully tested by entering various natural language queries and verifying relevant emails are returned.

**Acceptance Scenarios**:

1. **Given** the inbox is displayed, **When** the user enters "Find all emails that are financial offers", **Then** the list updates to show only emails containing financial offers, promotions, or deals
2. **Given** the inbox is displayed, **When** the user enters "Find emails that are promotions for an online or in-person event", **Then** the list shows emails about events, webinars, conferences, or meetups
3. **Given** the inbox is displayed, **When** the user enters "Find emails that include links to the current issue of a trading newsletter", **Then** the list shows newsletter emails with links to recent issues
4. **Given** a natural language query is active, **When** the user clears the query, **Then** the full inbox list is restored
5. **Given** a query returns no matches, **When** the results are displayed, **Then** the user sees a clear message indicating no emails matched

---

### User Story 4 - Apply Actions to Emails (Priority: P2) — TUI MVP

After finding emails (via filtering or natural language search), a user wants to take action on them. They can toggle selection on individual emails (e.g., Space key) or select all visible emails, then apply labels, archive, or delete the selected emails via keyboard shortcuts.

**Why this priority**: Taking action on emails is the purpose of finding them - without this, the search features have no practical value.

**Independent Test**: Can be fully tested by selecting emails and applying each action type, verifying the changes persist in Gmail.

**Acceptance Scenarios**:

1. **Given** a list of emails is displayed, **When** the user presses the selection key (e.g., Space) on an email, **Then** that email is highlighted as selected
2. **Given** a list of emails is displayed, **When** the user invokes "Select All" (e.g., Ctrl+A), **Then** all visible emails are selected
3. **Given** one or more emails are selected, **When** the user invokes "Apply Label" and selects a label, **Then** that label is applied to all selected emails
4. **Given** one or more emails are selected, **When** the user invokes "Archive" (e.g., 'a' key), **Then** selected emails are archived and removed from the inbox view
5. **Given** one or more emails are selected, **When** the user invokes "Delete" (e.g., 'd' key), **Then** selected emails are moved to trash
6. **Given** emails have been selected, **When** the user presses the selection key again or invokes clear selection, **Then** the selection is cleared

---

### User Story 5 - Save Queries for Reuse (Priority: P3) — TUI Fast Follow

A user has created a natural language query that they want to use regularly. They save the query with an optional action (e.g., "archive matching emails"). The saved query is available for future sessions.

**Why this priority**: Saved queries reduce repetitive work but require the core search and action features to be complete first.

**Independent Test**: Can be fully tested by saving a query, closing the application, reopening, and verifying the saved query is available.

**Acceptance Scenarios**:

1. **Given** a natural language query has been executed, **When** the user invokes "Save Query", **Then** they are prompted to name the query
2. **Given** the save query prompt is displayed, **When** the user optionally selects an action (label/archive/delete), **Then** the action is associated with the saved query
3. **Given** a query is saved, **When** the user opens the saved queries list, **Then** the saved query appears with its name and associated action
4. **Given** a saved query exists, **When** the user selects and executes it, **Then** the natural language query executes and shows matching emails

---

### User Story 6 - Automated Query Suggestions on Session Start (Priority: P3) — TUI Fast Follow

When a user opens the application and has saved queries, the system prompts them to re-run those queries against emails received since the last session. This helps users quickly process new emails using their established rules.

**Why this priority**: This automation builds on saved queries and provides ongoing value, but is not essential for initial use.

**Independent Test**: Can be fully tested by saving queries, receiving new emails, then reopening the application and verifying the prompt appears.

**Acceptance Scenarios**:

1. **Given** the user has saved queries and new emails have arrived since last session, **When** the user opens the application, **Then** they are prompted to run their saved queries
2. **Given** the prompt is displayed, **When** the user confirms, **Then** saved queries run in their specified order against new emails
3. **Given** the prompt is displayed, **When** the user declines, **Then** the normal inbox view is shown without running queries
4. **Given** multiple saved queries exist, **When** running queries on session start, **Then** queries execute in the user-defined order

---

### User Story 7 - Manage Saved Queries (Priority: P3) — TUI Fast Follow

A user wants to organize and maintain their saved queries. They can view all saved queries, change their execution order, edit the associated action, or delete queries they no longer need.

**Why this priority**: Query management is a maintenance feature that supports long-term use but isn't needed for initial adoption.

**Independent Test**: Can be fully tested by creating multiple saved queries and performing edit, reorder, and delete operations.

**Acceptance Scenarios**:

1. **Given** multiple saved queries exist, **When** the user opens query management, **Then** all queries are listed with their names, query text, and actions
2. **Given** the query list is displayed, **When** the user moves a query up/down (e.g., Ctrl+Up/Down), **Then** the execution order is updated
3. **Given** a saved query exists, **When** the user edits its associated action, **Then** the new action is saved
4. **Given** a saved query exists, **When** the user deletes it, **Then** the query is removed from the list and no longer appears on session start

---

### Edge Cases

- What happens when Gmail API rate limits are exceeded? System automatically retries with exponential backoff; user sees status indicator during retry and friendly message if retries exhausted.
- What happens when the natural language query is too vague to interpret? System requests clarification or shows a "query too broad" message.
- What happens when the user's Gmail connection expires? User is prompted to re-authenticate.
- What happens when applying an action fails for some emails? User sees which emails failed and can retry.
- What happens when saved queries conflict (e.g., same email matches multiple queries with different actions)? User is notified and can choose which action to apply.

## Requirements *(mandatory)*

### Functional Requirements

**Architecture**
- **FR-001**: System MUST implement business logic in a frontend-agnostic core library
- **FR-001a**: Core library MUST be consumable by both TUI and web frontends
- **FR-001b**: Frontends MUST NOT contain business logic (thin presentation layer only)

**Gmail Integration**
- **FR-002**: System MUST connect to the user's Gmail account via secure authentication
- **FR-002a**: System MUST accept the target Gmail account as a command line argument
- **FR-003**: System MUST retrieve and display emails from the user's Gmail inbox
- **FR-004**: System MUST display email metadata including sender, subject, date, labels, and read status
- **FR-004a**: System MUST sync actions (label, archive, delete) back to Gmail
- **FR-004b**: System MUST automatically retry transient API failures with exponential backoff before surfacing errors to users

**TUI Navigation**
- **FR-005**: System MUST support vim-style navigation (j/k for up/down)
- **FR-005a**: System MUST support arrow key navigation
- **FR-005b**: System MUST use Enter key to select/execute actions
- **FR-005c**: System MUST display keyboard shortcuts or provide help (e.g., '?' key)

**Email Display**
- **FR-006**: System MUST display inbox emails in a scrollable list view with paginated loading (load additional batches as user navigates)
- **FR-006a**: System MUST allow users to configure the initial email load size
- **FR-007**: System MUST display unread emails in bold text
- **FR-008**: System MUST show email contents in a preview pane when an email is selected
- **FR-009**: System MUST support sorting by sender, date, label, and category
- **FR-010**: System MUST support filtering by sender, date range, label, and category
- **FR-011**: System MUST default to showing all emails sorted by date descending

**Natural Language Search**
- **FR-012**: System MUST accept natural language queries describing desired emails
- **FR-013**: System MUST interpret query intent and match against email content semantically
- **FR-014**: System MUST update the email list to show only matching results
- **FR-015**: System MUST allow clearing the query to restore the full inbox view

**Email Actions**
- **FR-016**: System MUST allow selecting individual emails (e.g., Space key to toggle)
- **FR-017**: System MUST allow selecting all visible emails at once (e.g., Ctrl+A)
- **FR-018**: System MUST allow applying Gmail labels to selected emails
- **FR-019**: System MUST allow archiving selected emails
- **FR-020**: System MUST allow deleting (moving to trash) selected emails

**Saved Queries (TUI Fast Follow)**
- **FR-021**: System MUST allow saving natural language queries with a user-defined name
- **FR-022**: System MUST allow associating an optional action with a saved query
- **FR-023**: System MUST persist saved queries across sessions
- **FR-024**: System MUST prompt users to run saved queries on session start when new emails exist
- **FR-025**: System MUST allow users to define execution order for saved queries
- **FR-026**: System MUST allow editing the action associated with a saved query
- **FR-027**: System MUST allow deleting saved queries

### Key Entities

- **Email**: Represents a Gmail message with sender, recipients, subject, body, date, labels, category, and read/unread status
- **Label**: Gmail label that can be applied to emails for organization
- **Category**: Gmail category (Primary, Social, Promotions, Updates, Forums)
- **Natural Language Query**: User-entered text describing emails to find, interpreted semantically
- **Saved Query**: A named, persisted natural language query with optional associated action
- **Action**: An operation to perform on emails (apply label, archive, delete)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their inbox and read any email within 5 seconds of opening the application
- **SC-002**: Users can find emails matching a natural language description in under 10 seconds
- **SC-003**: Natural language queries return relevant results for 80% of typical use cases (financial emails, event promotions, newsletters)
- **SC-004**: Users can apply actions to 100+ emails in a single operation
- **SC-005**: Saved queries execute automatically on session start, processing new emails in under 30 seconds
- **SC-006**: Users can complete a full workflow (query → review → action) in under 2 minutes
- **SC-007**: 90% of users successfully create and save a query on their first attempt

## Clarifications

### Session 2026-01-31

- Q: How many emails should be loaded initially? → A: Paginated loading with user-configurable initial load size
- Q: How should Gmail API failures be handled? → A: Automatic retry with exponential backoff for transient failures
- Q: Single or multi-account support? → A: Single Gmail account per session, specified via command line argument
- Q: What is the primary user interface? → A: TUI (Terminal User Interface) with vim-style + arrow key navigation
- Q: Will there be a web interface? → A: Yes, local web app (localhost only) as post-TUI fast follow
- Q: Should TUI and web share backend? → A: Yes, shared backend/business logic with frontend-agnostic core
- Q: When are Saved Queries delivered? → A: TUI Fast Follow (after TUI MVP with core features)

## Out of Scope

**Not in TUI MVP:**
- Saved Queries & Workflows (User Stories 5-7) — deferred to TUI Fast Follow
- Web interface — deferred to post-TUI fast follow
- Multi-account support
- Cloud/remote hosting
- Mobile interface

**Not in any planned phase:**
- Email composition/sending
- Calendar integration
- Contact management

## Assumptions

- Users have an active Gmail account with OAuth2 access enabled
- Users grant the application permission to read, modify, and organize their emails
- The application is launched from the command line with the target Gmail account specified as an argument
- Gmail's API provides sufficient access to email content for natural language analysis
- Users understand that natural language search is semantic/conceptual rather than keyword-exact
- TUI users are comfortable with keyboard-driven interfaces (vim-style navigation)
