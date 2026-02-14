# Feature Specification: Smart Email Filter

**Feature Branch**: `002-smart-email-filter`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Implement smart email filtering using an LLM to determine which emails match user-entered description"

## Clarifications

### Session 2026-02-14

- Q: Which AI provider will be used, and is it configurable? → A: Configurable AI provider supporting Anthropic and OpenAI-compatible APIs.
- Q: What is the default AI provider when none is configured? → A: No default; require explicit configuration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter Inbox by Natural Language Description (Priority: P1)

A user is looking at their inbox and wants to find specific emails without knowing the exact sender, subject, or label. They activate the smart filter, type a natural language description such as "newsletters about investing" or "messages from friends about weekend plans", and the inbox updates to show only the emails that match their description. An AI evaluates each email against the description and determines relevance.

**Why this priority**: This is the core value proposition — enabling users to find emails using everyday language rather than rigid search syntax. Without this, the feature has no reason to exist.

**Independent Test**: Can be fully tested by entering a filter description against a known set of emails and verifying that relevant emails appear and irrelevant ones are hidden.

**Acceptance Scenarios**:

1. **Given** the inbox is displayed with emails loaded, **When** the user activates the smart filter and types "receipts from online purchases", **Then** only emails that are purchase receipts are shown in the list
2. **Given** the inbox is displayed, **When** the user enters a filter description, **Then** a loading indicator is shown while the AI evaluates emails
3. **Given** the AI has evaluated all visible emails, **When** results are ready, **Then** the email list updates to show only matching emails with a count of matches vs total
4. **Given** the user has entered a filter description, **When** no emails match the description, **Then** a message is displayed indicating no matches were found

---

### User Story 2 - Clear Smart Filter and Return to Full Inbox (Priority: P1)

After applying a smart filter, the user wants to return to seeing all their emails. They press a key to clear the filter and the full inbox is restored immediately without re-fetching from the server.

**Why this priority**: Without the ability to clear a filter, users would be stuck in a filtered view. This is essential for the filter to be usable.

**Independent Test**: Can be tested by applying a smart filter, verifying filtered results, then clearing and verifying all emails are restored.

**Acceptance Scenarios**:

1. **Given** a smart filter is active, **When** the user presses the clear filter key, **Then** the full email list is restored
2. **Given** a smart filter is active, **When** the user clears the filter, **Then** the filter description is removed from the display
3. **Given** no smart filter is active, **When** the user presses the clear filter key, **Then** nothing changes

---

### User Story 3 - View Filter Match Confidence (Priority: P2)

When a smart filter is active, the user wants to understand how confident the AI is about each match. Each email in the filtered list shows a relevance indicator (e.g., high/medium/low confidence) so the user can quickly identify the most relevant results.

**Why this priority**: Enhances trust in AI results by showing transparency. Not essential for MVP but significantly improves user experience.

**Independent Test**: Can be tested by applying a filter and verifying that each result displays a confidence indicator that correlates with actual relevance.

**Acceptance Scenarios**:

1. **Given** a smart filter is active and results are displayed, **When** the user views the email list, **Then** each email shows a relevance indicator
2. **Given** a smart filter returns results with varying relevance, **When** the list is displayed, **Then** results are sorted by confidence (highest first)

---

### Edge Cases

- What happens when the user enters a very vague description like "stuff" or "things"? The system should still attempt to filter and return best-effort results.
- What happens when the user enters an empty description? The system should not apply a filter and show an error or ignore the input.
- How does the system handle emails with no body content (only subject/sender)? The AI should evaluate based on available metadata.
- What happens if the AI service is unreachable or returns an error? The system should display an error message and keep the current unfiltered view intact.
- What happens if the user navigates to new emails while a filter evaluation is in progress? The system should cancel the in-progress evaluation and start fresh if the user enters a new filter.
- What happens if no AI provider is configured? The system should display a clear error message when the user activates the smart filter, directing them to configure a provider.
- What happens if the inbox has hundreds of emails? The system should evaluate emails in progressive batches (e.g., 50 at a time), showing partial results as each batch completes and refining the filtered view incrementally until all loaded emails have been evaluated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a keyboard shortcut to activate the smart filter input mode
- **FR-002**: System MUST display a text input field where the user can type a natural language filter description
- **FR-003**: System MUST send email metadata (subject, sender name, snippet) to a configurable AI service for relevance evaluation against the user's description
- **FR-015**: System MUST support Anthropic and OpenAI-compatible AI providers, selectable via configuration
- **FR-016**: System MUST allow the user to configure the AI provider and model via environment variables or configuration file
- **FR-017**: System MUST require explicit AI provider configuration; if not configured, the smart filter feature MUST display a clear error message directing the user to configure a provider
- **FR-004**: System MUST display a loading indicator while AI evaluation is in progress
- **FR-005**: System MUST update the email list to show only emails classified as matching the description
- **FR-006**: System MUST display the active filter description in the UI so the user knows a filter is applied
- **FR-007**: System MUST provide a keyboard shortcut to clear the active smart filter
- **FR-008**: System MUST restore the full email list when the smart filter is cleared
- **FR-009**: System MUST display the count of matching emails vs total emails when a filter is active
- **FR-010**: System MUST handle AI service errors gracefully, showing an error message and preserving the current unfiltered view
- **FR-011**: System MUST assign a confidence level (high, medium, low) to each matched email
- **FR-012**: System MUST sort filtered results by confidence level, highest first
- **FR-013**: System MUST reject empty filter descriptions and not apply a filter
- **FR-014**: System MUST evaluate emails in progressive batches, showing partial results as each batch completes and continuing until all loaded emails have been evaluated

### Key Entities

- **Filter Description**: A natural language string entered by the user describing the emails they want to find. Has a lifecycle of active/inactive.
- **Match Result**: The AI's evaluation of a single email against the filter description. Contains a relevance classification (match/no-match) and confidence level (high/medium/low).
- **Filtered View**: A temporary view state that shows only matched emails. Preserves the original email list so it can be restored when the filter is cleared.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enter a filter description and see filtered results within 10 seconds for an inbox of 50 emails
- **SC-002**: Smart filter correctly identifies at least 80% of relevant emails for common filter descriptions (e.g., "newsletters", "receipts", "messages from coworkers")
- **SC-003**: Users can clear a filter and return to the full inbox in under 1 second
- **SC-004**: 90% of AI evaluation errors are handled gracefully without crashing the application
- **SC-005**: Users can complete a filter-view-clear cycle in under 30 seconds

## Assumptions

- The user has already authenticated and has emails loaded in the inbox (US1 is complete)
- An AI/LLM service (Anthropic or OpenAI-compatible) is available and configured with appropriate credentials
- Email metadata (subject, sender, snippet) provides sufficient context for meaningful filtering; full email bodies are not required for the initial evaluation
- The AI service supports batch evaluation of multiple emails in a single request for efficiency
- Standard keyboard shortcuts are available in the TUI for activating and clearing the filter (e.g., `f` for filter, `Esc` to clear)

## Dependencies

- US1 (View and Browse Inbox) must be complete — emails must be loaded and displayed
- An AI/LLM service must be accessible from the application environment
- Email data model must include at minimum: subject, sender, and snippet/preview text

## Out of Scope

- Saving or recalling previous filter descriptions
- Combining smart filters with traditional label/category filters
- Training or fine-tuning the AI model on user-specific email patterns
- Filtering emails that have not yet been loaded into the application
- Real-time streaming of filter results as each email is evaluated (batch results are acceptable)
