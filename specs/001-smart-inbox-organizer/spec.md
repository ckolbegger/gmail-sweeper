# Feature Specification: Smart Inbox Organizer

**Feature Branch**: `kimi`
**Created**: 2026-01-31
**Status**: Draft
**Input**: User description: "InitialPrompt.md"

## Clarifications

### Session 2026-01-31

- Q: CLI-first or web-first for MVP? → A: CLI first, web second - sequential phases with shared backend (Option C)
- Q: Architecture for CLI and web? → A: Shared core library with thin CLI wrapper; web app adds HTTP layer later (recommended)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Filter Inbox (Priority: P1)

As a user, I want to view my Gmail inbox with sorting and filtering capabilities so I can quickly find relevant emails.

**Why this priority**: This is the core foundation of the application. Without the ability to view and organize emails, no other features can function.

**Independent Test**: Can be fully tested by connecting to Gmail, displaying emails in a list view, and verifying that sorting by date (descending), sender, label, and category works correctly.

**Acceptance Scenarios**:

1. **Given** the user has authenticated with Gmail, **When** the application loads, **Then** the inbox displays all emails sorted by descending date received
2. **Given** emails are displayed in the list, **When** an email is unread, **Then** it appears in bold text
3. **Given** the email list is displayed, **When** the user selects a sort option (sender, date, label, category), **Then** the list reorders accordingly
4. **Given** the email list is displayed, **When** the user applies a filter, **Then** only matching emails are shown

---

### User Story 2 - Natural Language Email Search (Priority: P1)

As a user, I want to describe the emails I'm looking for using natural language so I can find specific types of messages without complex query syntax.

**Why this priority**: This is the "magic feature" that differentiates this application from standard Gmail interfaces. It enables users to find emails based on semantic meaning rather than just metadata.

**Independent Test**: Can be fully tested by entering natural language queries (e.g., "financial offers", "event promotions") and verifying that the email list updates to show semantically matching emails.

**Acceptance Scenarios**:

1. **Given** the user is viewing the inbox, **When** they enter "Find all emails that are financial offers" at the natural language prompt, **Then** the email list updates to show only emails matching that description
2. **Given** the user is viewing the inbox, **When** they enter "promotions for online or in-person events", **Then** the list filters to event-related promotional emails
3. **Given** the user is viewing the inbox, **When** they enter "links to the current issue of my trading newsletter", **Then** the list shows newsletter emails with current issue links
4. **Given** a natural language query has been executed, **When** results are displayed, **Then** the user can see email contents in a detail pane adjacent to the list

---

### User Story 3 - Email Actions (Priority: P1)

As a user, I want to select emails and apply actions (label, archive, delete) so I can manage my inbox efficiently.

**Why this priority**: This completes the core workflow - finding emails is only valuable if the user can act on them. This enables actual inbox management.

**Independent Test**: Can be fully tested by selecting individual or all emails and applying labels, archiving, or deleting them, then verifying the actions are reflected in Gmail.

**Acceptance Scenarios**:

1. **Given** emails are displayed in the list, **When** the user presses the select-all keyboard shortcut, **Then** all items become selected
2. **Given** emails are displayed in the list, **When** the user navigates and selects individual emails via keyboard, **Then** only those items are selected
3. **Given** one or more emails are selected, **When** the user triggers the "Apply Label" command, **Then** the selected label is applied to all selected emails
4. **Given** one or more emails are selected, **When** the user triggers the "Archive" command, **Then** the selected emails are archived
5. **Given** one or more emails are selected, **When** the user triggers the "Delete" command, **Then** the selected emails are moved to trash

---

### User Story 4 - Save Queries and Actions (Priority: P2)

As a user, I want to save natural language queries along with their associated actions so I can reuse common workflows.

**Why this priority**: This builds on the core functionality by enabling workflow persistence. It reduces repetitive work for common inbox management tasks.

**Independent Test**: Can be fully tested by running a natural language query, applying actions to results, saving the query-action pair, and verifying it appears in saved workflows.

**Acceptance Scenarios**:

1. **Given** the user has executed a natural language query, **When** they trigger the "Save Query" command, **Then** the query is saved with an optional name
2. **Given** the user is saving a query, **When** they choose to save the associated action, **Then** the action (label/archive/delete) is stored with the query
3. **Given** the user has saved queries, **When** they view saved workflows, **Then** all saved queries are listed with their associated actions
4. **Given** the user has saved queries, **When** they select a saved query, **Then** they can edit the associated action

---

### User Story 5 - Automated Session Workflows (Priority: P2)

As a user, I want saved queries to automatically run against new emails when I open a session so I can maintain inbox organization without manual repetition.

**Why this priority**: This enables automated inbox maintenance. It transforms the app from a manual tool into an automated organizer that works across sessions.

**Independent Test**: Can be fully tested by saving queries, closing the session, receiving new emails, reopening the app, and verifying the user is prompted to run saved queries against emails received since last session.

**Acceptance Scenarios**:

1. **Given** the user has saved queries and opens a new session, **When** new emails have arrived since the last session, **Then** the user is prompted to run saved queries against those new emails
2. **Given** multiple saved queries exist, **When** the user configures query order, **Then** the queries execute in that specified sequence
3. **Given** the user is prompted to run saved queries, **When** they confirm, **Then** each query runs against emails received since the last session
4. **Given** saved queries have been run on new emails, **When** results are found, **Then** the user can review and confirm actions before they are applied

---

### Edge Cases

- What happens when the natural language query returns no matching emails?
- How does the system handle Gmail API rate limiting or authentication expiration?
- What happens when a user tries to apply an action to emails that have already been archived/deleted by another client?
- How does the system handle very large inboxes (10,000+ emails) when executing natural language queries?
- What happens when a saved query's natural language is ambiguous or could match multiple categories?
- How are conflicts handled when multiple saved queries would apply different actions to the same email?

## Out of Scope *(explicit exclusions)*

The following are explicitly excluded from MVP (Phase 1-2) and planned for Phase 3:

- **Web Application Interface**: A browser-based UI is a fast-follow post-MVP feature, not required for initial release
- **Mobile Applications**: Native iOS/Android apps are out of scope
- **Multi-user/Team Features**: Single-user only for MVP
- **Email Composition/Sending**: Read and organize only; no outbound email functionality

## Architecture Notes *(implementation guidance)*

### Interface Strategy

**Phase 1-2 (MVP)**: Command-line TUI (Terminal User Interface)
- Primary interface for power users
- Fast, keyboard-driven workflow
- Local execution with OAuth2 authentication

**Phase 3 (Post-MVP)**: Web Application
- HTTP layer wrapping the shared core library
- Browser-based access for broader audience
- Same underlying business logic as CLI

### Core Library Design

All business logic MUST be implemented in a shared core library:
- Gmail API communication
- Natural language query processing
- Email filtering and sorting logic
- Workflow persistence and execution

The CLI is a thin wrapper around this core library, handling:
- Terminal rendering and input
- OAuth2 flow initiation
- Session management

The future web app will add:
- HTTP server layer
- WebSocket or REST endpoints
- Browser-based UI rendering

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate with user's Gmail account via OAuth2
- **FR-002**: System MUST display emails in a CLI list view with subject, sender, date received, and labels
- **FR-003**: System MUST sort emails by date received in descending order by default
- **FR-004**: System MUST visually distinguish unread emails in the TUI (e.g., bold or color)
- **FR-005**: System MUST allow sorting by sender, date, label, and category via keyboard commands
- **FR-006**: System MUST allow filtering by sender, date range, label, and category via CLI arguments or interactive input
- **FR-007**: System MUST provide a natural language input prompt for semantic email search
- **FR-008**: System MUST interpret natural language queries and return semantically matching emails
- **FR-009**: System MUST display email content in a detail pane when an email is selected via keyboard navigation
- **FR-010**: System MUST allow selecting individual emails via keyboard shortcuts
- **FR-011**: System MUST allow selecting all emails in the current view via keyboard shortcut
- **FR-012**: System MUST apply Gmail labels to selected emails
- **FR-013**: System MUST archive selected emails
- **FR-014**: System MUST delete (move to trash) selected emails
- **FR-015**: System MUST allow saving natural language queries with a custom name
- **FR-016**: System MUST optionally save the action (label/archive/delete) associated with a query
- **FR-017**: System MUST display all saved queries in a workflows list view
- **FR-018**: System MUST allow editing the action associated with a saved query
- **FR-019**: System MUST track the timestamp of the last session
- **FR-020**: System MUST identify emails received since the last session
- **FR-021**: System MUST prompt the user to run saved queries against new emails on session open
- **FR-022**: System MUST allow users to specify the execution order of multiple saved queries
- **FR-023**: System MUST execute saved queries in the specified order against new emails

### Key Entities *(include if feature involves data)*

- **Email**: Represents a Gmail message with attributes: id, threadId, subject, sender, recipients, dateReceived, body, labels, isRead, category
- **Query**: Represents a saved natural language search with attributes: id, name, naturalLanguageText, createdAt, lastRunAt
- **Workflow**: Represents a query-action pair with attributes: id, queryId, actionType (LABEL/ARCHIVE/DELETE), actionParams (e.g., label name), executionOrder
- **Session**: Represents a user session with attributes: id, startedAt, endedAt, lastEmailCheckTimestamp
- **Core Library**: Shared business logic module containing Gmail API client, natural language processor, email repository, and workflow engine. Used by both CLI and future web app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find specific email categories using natural language in under 30 seconds
- **SC-002**: Natural language search returns relevant results (user-rated relevance) for 80% of queries
- **SC-003**: Users can complete common inbox organization tasks (find + act on emails) in under 2 minutes
- **SC-004**: System supports inboxes with up to 50,000 emails without performance degradation
- **SC-005**: 90% of users successfully create and save at least one workflow within first session
- **SC-006**: Saved workflows reduce repetitive manual actions by 50% for active users
- **SC-007**: Email list renders initial view in under 3 seconds for inboxes with 10,000 emails
- **SC-008**: Natural language query returns results in under 5 seconds for typical queries
