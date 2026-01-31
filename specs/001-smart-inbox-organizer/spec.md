# Feature Specification: Smart Inbox Organizer

**Feature Branch**: `001-smart-inbox-organizer`  
**Created**: 2026-01-31  
**Status**: Draft  
**Input**: User description: "I want to build an application that allows users to organize their gmail inboxes..."

## Clarifications

### Session 2026-01-31
- Q: Which TUI framework should be used to support the future web app goal? → A: **Ink (React-based)**.
- Q: How should Workflows be persisted locally? → A: **Local JSON File**.
- Q: What is the email fetching and pagination strategy? → A: **Pagination (50 items default)**, with configurable page size via CLI.
- Q: Which Gemini model should be used for the filtering MVP? → A: **gemini-3-flash**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Navigate Inbox (Priority: P1)

Users can view their inbox emails in a list, sorted by date/sender/etc., and preview the content of a selected email in a dedicated panel.

**Why this priority**: Core functionality. Without seeing emails, organization is impossible.

**Independent Test**: Can be tested by launching the app and verifying the inbox list loads, unread emails are bold, and the preview panel updates when navigating.

**Acceptance Scenarios**:

1. **Given** the user has emails in their inbox, **When** the application starts, **Then** a list of emails is displayed sorted by date (newest first).
2. **Given** the list contains unread emails, **When** displayed, **Then** unread emails appear in **bold** text.
3. **Given** the email list is visible, **When** the user selects an email, **Then** the email's body and details are rendered in the right-side panel.
4. **Given** the list is displayed, **When** the user applies a sort (Sender, Date, Label), **Then** the list order updates accordingly.

---

### User Story 2 - Natural Language Filtering (Priority: P2)

Users can type natural language queries (e.g., "financial offers") to filter the email list using an AI-powered rules engine.

**Why this priority**: The "magic" feature that differentiates this tool from standard clients.

**Independent Test**: Can be tested by mocking the NL engine response and verifying the list filters correctly based on the returned criteria.

**Acceptance Scenarios**:

1. **Given** the inbox list is displayed, **When** the user types a natural language query (e.g., "Find newsletter issues"), **Then** the list updates to show only emails matching that intent.
2. **Given** a query is active, **When** the user clears it, **Then** the full inbox list is restored.

---

### User Story 3 - Organize Actions (Label, Archive, Delete) (Priority: P3)

Users can select one or multiple emails and perform organization actions: Label, Archive, or Delete.

**Why this priority**: Completes the "organizer" workflow.

**Independent Test**: Can be tested by selecting mock emails and verifying the correct API calls (Label, Archive, Trash) are triggered.

**Acceptance Scenarios**:

1. **Given** one or more emails are selected, **When** the user chooses "Archive", **Then** the system prompts for confirmation (Safety Principle).
2. **Given** confirmation is granted, **When** the action completes, **Then** the emails are removed from the view and archived in Gmail.
3. **Given** one or more emails are selected, **When** the user chooses "Apply Label", **Then** the user can select/create a label to apply.

### User Story 4 - Saved Workflows (Priority: P2)

Users can save successful queries (and optional actions) as "Workflows" to quickly re-run them on new emails.

**Why this priority**: Enhances the "Smart" aspect by automating repetitive tasks.

**Independent Test**: Can be tested by saving a query, restarting the app, and verifying the saved query appears and executes correctly against new mock emails.

**Acceptance Scenarios**:

1. **Given** a successful query is active, **When** the user chooses "Save Workflow", **Then** the query is saved with a user-provided name.
2. **Given** a saved workflow, **When** the application starts, **Then** the user is prompted to run saved workflows against emails received since the last run.
3. **Given** multiple saved workflows, **When** running them, **Then** they execute in the user-defined order.
4. **Given** a saved workflow with an associated action (e.g., Archive), **When** run, **Then** the action is proposed as the default but allows editing before execution.

### Edge Cases


- **Empty Inbox**: App should display a "No emails found" message.
- **API Rate Limits**: App should handle 429 errors gracefully (retry/alert).
- **Network Failure**: App should alert the user if Gmail is unreachable.
- **Complex NL Queries**: What if the NL engine cannot understand the query? (Show error/no results).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate with the Gmail API using OAuth2.
- **FR-002**: System MUST fetch and display email metadata (Sender, Subject, Date, Snippet, Unread Status).
- **FR-003**: System MUST fetch and render email body content (Text/HTML) in a separate panel.
- **FR-004**: System MUST allow sorting the list by Date, Sender, Label, and Category.
- **FR-005**: System MUST interpret natural language input to generate filtering criteria using the Gemini API (specifically **gemini-3-flash**), with an abstraction layer to support any OpenAI-compatible endpoint.
- **FR-006**: System MUST allow multi-selection of emails from the list.
- **FR-007**: System MUST support "Archive", "Delete" (Trash), and "Label" actions.
- **FR-008**: System MUST require explicit user confirmation before any destructive action (Archive, Delete) per the Constitution.
- **FR-009**: The User Interface MUST be implemented as a Rich Terminal User Interface (TUI) using **Ink (React-based)**, with business logic decoupled to support a future local web application.

- **FR-010**: System MUST allow saving current NL query and optional action as a "Workflow".
- **FR-011**: System MUST persist the "Last Run Time" for each workflow to filter for new emails.
- **FR-012**: System MUST allow re-ordering of saved workflows.
- **FR-013**: System MUST prompt users on startup to execute saved workflows.
- **FR-014**: Workflows MUST be persisted to a local JSON file (e.g., `~/.config/gmail-sweep/workflows.json`) to support user inspection and portability.
- **FR-015**: System MUST support paginated email fetching with a default page size of 50.
- **FR-016**: System MUST allow users to override the default page size via a command-line argument (e.g., `--limit 100`).

### Key Entities

- **Workflow**: A saved automation rule (Name, Query, ActionTemplate, Order, LastRunAt).
- **Email**: Represents a single message (ID, ThreadID, Subject, Sender, Date, Snippet, Body, Labels).
- **Thread**: Group of related emails.
- **FilterQuery**: The structured representation of the user's natural language input.

### Constraints & Tradeoffs

- **Tech Stack**: React/Ink chosen for TUI to maximize code reuse for future web frontend.
- **Persistence**: Local JSON storage chosen for simplicity and transparency over database solutions.
- **Data Volume**: Pagination limit (50 items) ensures low latency and respects Gmail API limits while remaining configurable.
- **AI Intelligence**: **gemini-3-flash** selected for high-speed, cost-effective intent classification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Application launch time to inbox display is under 3 seconds (cached) or 5 seconds (fresh fetch).
- **SC-002**: Natural language filtering returns relevant results within 5 seconds for queries like "financial offers".
- **SC-003**: Bulk actions (e.g., archive 10 emails) complete within 2 seconds of confirmation.
- **SC-004**: Zero accidental deletions (ensured by mandatory confirmation steps).