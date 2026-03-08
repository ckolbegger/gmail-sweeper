# Feature Specification: Background Summary Precomputation

**Feature Branch**: `007-summary-precompute`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "I want to precompute summaries for emails that don't already have one. I would like a background worker that starts when the app is started. It should review the emails in the cache from newest to oldest. For any email that doesn't have a summary it should generate and store a summary. It should continue until the first 500 emails in the cache have summaries. Every time email is fetched, it should start again from the top of the inbox and work until the first N emails have summaries. N should be configurable and default to 500."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Background Summarisation on Startup (Priority: P1)

When the app starts, a background worker automatically begins generating summaries for cached emails that don't yet have one. It processes emails from newest to oldest, stopping once the configured number of emails (default: 500) all have summaries. The user doesn't need to do anything — by the time they navigate to older emails, summaries are already available.

**Why this priority**: This is the core value of the feature. Without the background worker running, no precomputation happens. All other stories depend on this foundational behaviour.

**Independent Test**: Start the app with a cache containing emails lacking summaries. After a short wait, verify that previously unsummarised emails now have summaries stored, without the user pressing 's' on any of them.

**Acceptance Scenarios**:

1. **Given** the app has just started and the cache contains emails without summaries, **When** the background worker runs, **Then** it generates and stores summaries for unsummarised emails from newest to oldest.
2. **Given** the background worker is running, **When** the first N emails all have summaries, **Then** the worker stops processing.
3. **Given** an email already has a cached summary, **When** the background worker encounters it, **Then** it skips that email and moves to the next.
4. **Given** the app starts with all N most-recent emails already summarised, **When** the worker starts, **Then** it performs no AI calls and exits immediately.

---

### User Story 2 - Worker Restarts After New Emails Are Fetched (Priority: P2)

Every time new emails are fetched into the cache, the background worker restarts from the top of the inbox. This ensures newly-arrived emails are prioritised for summarisation, and the coverage window always reflects the most up-to-date inbox.

**Why this priority**: Without this, new emails fetched via Ctrl-N would never be precomputed. The worker would finish once and never run again, leaving new arrivals unsummarised.

**Independent Test**: Start the app, let the worker settle. Then fetch more emails (Ctrl-N). Verify the worker resumes and processes newly-fetched unsummarised emails before resuming coverage of older ones.

**Acceptance Scenarios**:

1. **Given** the worker has finished its initial pass, **When** new emails are fetched, **Then** the worker restarts from the newest email in the cache.
2. **Given** the worker is mid-pass and new emails are fetched, **When** the fetch completes, **Then** the current pass is cancelled and a fresh pass begins from the top.
3. **Given** new emails are fetched and all N most-recent emails already have summaries, **When** the worker restarts, **Then** it performs no AI calls and exits immediately.

---

### User Story 3 - Configurable Coverage Limit (Priority: P3)

The number of emails to keep summarised (N) is configurable. The default is 500. Users or operators can set a different value to trade off API cost against coverage depth.

**Why this priority**: The feature works correctly at default N=500 without configuration. Configurability is an enhancement that reduces operational friction for power users.

**Independent Test**: Set N to a small value (e.g., 5). Verify the worker stops after the 5 most-recent emails have summaries and does not process email 6 or beyond.

**Acceptance Scenarios**:

1. **Given** N is set to a custom value, **When** the worker runs, **Then** it stops once the first N emails all have summaries.
2. **Given** no explicit N is configured, **When** the worker runs, **Then** it behaves as if N=500.

---

### User Story 4 - Configurable Maximum Depth Ceiling (Priority: P3)

There is a hard ceiling on how deep into the inbox the worker will ever summarise. Once the top MAXIMUM_DEPTH emails all have summaries, no subsequent worker pass will go any deeper, even if N is set higher than MAXIMUM_DEPTH or new fetches trigger a restart. This prevents unbounded growth in API usage as the inbox accumulates emails over time.

**Why this priority**: Without a depth ceiling, an inbox that grows continuously would cause the worker to summarise an ever-increasing number of older emails across restarts, driving up AI API costs. MAXIMUM_DEPTH is an independent safety valve from the per-pass target N.

**Independent Test**: Set MAXIMUM_DEPTH to 10 and N to 20. After enough worker passes, verify that exactly the top 10 emails have summaries and emails at positions 11 and beyond are never processed, even after new fetches.

**Acceptance Scenarios**:

1. **Given** MAXIMUM_DEPTH is set to 10, **When** the worker has summarised the top 10 emails, **Then** no subsequent pass processes any email at position 11 or deeper.
2. **Given** MAXIMUM_DEPTH is less than N, **When** the worker runs, **Then** the effective depth is capped at MAXIMUM_DEPTH (not N).
3. **Given** no explicit MAXIMUM_DEPTH is configured, **When** the worker runs, **Then** it behaves as if MAXIMUM_DEPTH=500.
4. **Given** the cache contains fewer emails than MAXIMUM_DEPTH, **When** the worker runs, **Then** it processes all available emails without error.

---

### Edge Cases

- What happens when AI generation fails for a specific email? The worker skips that email and continues to the next; the failed email remains unsummarised.
- What happens when the cache contains fewer than N emails? The worker summarises all available emails and stops.
- What happens when the app is closed mid-pass? Summaries already stored are persisted; the next startup resumes from scratch (re-evaluating from newest).
- What happens when two fetches arrive in quick succession? Only one worker pass runs at a time; the second fetch cancels any in-progress pass and starts a fresh one.
- What happens when MAXIMUM_DEPTH is set lower than N? MAXIMUM_DEPTH takes precedence; the effective per-pass depth is min(N, MAXIMUM_DEPTH).
- What happens if AI rate limits are hit? The worker pauses with exponential back-off and retries; it does not crash or block the UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST start a background summary worker automatically when the application launches.
- **FR-002**: The worker MUST process emails in order from newest to oldest.
- **FR-003**: The worker MUST skip any email that already has a stored summary.
- **FR-004**: The worker MUST stop once the first N emails in the cache all have summaries, where N is the configured coverage limit.
- **FR-005**: The default coverage limit N MUST be 500.
- **FR-006**: The coverage limit N MUST be configurable via the `SUMMARY_PRECOMPUTE_LIMIT` environment variable without modifying source code.
- **FR-013**: The worker MUST enforce a maximum depth ceiling: it MUST NOT process any email at a position deeper than MAXIMUM_DEPTH in the current inbox ordering.
- **FR-014**: The effective per-pass depth MUST be `min(N, MAXIMUM_DEPTH)`; if MAXIMUM_DEPTH is less than N, MAXIMUM_DEPTH takes precedence.
- **FR-015**: The default MAXIMUM_DEPTH MUST be 500.
- **FR-016**: MAXIMUM_DEPTH MUST be configurable via the `SUMMARY_PRECOMPUTE_MAX_DEPTH` environment variable without modifying source code.
- **FR-007**: The worker MUST restart from the newest email whenever new emails are fetched into the cache.
- **FR-008**: If a worker pass is in progress when new emails are fetched, the in-progress pass MUST be cancelled and a new pass started.
- **FR-009**: Summaries generated by the worker MUST be stored in the same persistent cache used by the manual 's' key flow.
- **FR-010**: The worker MUST run in the background and MUST NOT block or degrade the interactive UI. The worker provides no visible status indicator; it operates entirely silently.
- **FR-011**: If summary generation fails for an individual email, the worker MUST skip that email and continue processing remaining emails.
- **FR-012**: The worker MUST apply rate-limiting back-off when the AI provider signals it is being throttled, without crashing. No intentional inter-call delay is introduced; the worker sends the next request immediately after each response.

### Key Entities

- **Background Worker**: A long-running process that monitors the email cache, identifies gaps in summary coverage, and drives AI generation to fill them. Has states: idle, running, cancelled.
- **Coverage Window**: The ordered set of the N most-recent emails in the cache. The worker's goal is for every email in this window to have a summary.
- **Coverage Limit (N)**: A configurable integer (default 500) defining the per-pass target: how many of the newest emails should have summaries after each worker pass (`SUMMARY_PRECOMPUTE_LIMIT`).
- **Maximum Depth**: A configurable integer (default 500) defining the absolute position ceiling: the worker will never process an email deeper than this position, regardless of N (`SUMMARY_PRECOMPUTE_MAX_DEPTH`). Effective per-pass depth = `min(N, MAXIMUM_DEPTH)`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After app startup, the background worker begins processing unsummarised emails within 5 seconds, with no user interaction required.
- **SC-002**: When new emails are fetched, the worker restarts its pass within 2 seconds of the fetch completing.
- **SC-003**: The worker processes emails strictly from newest to oldest — no email is summarised before a newer unsummarised email in the coverage window.
- **SC-004**: A single AI generation failure does not stop the worker; it continues and completes its pass for all remaining emails.
- **SC-005**: The app UI remains responsive (no perceptible lag on keystrokes) while the worker is actively generating summaries.
- **SC-006**: Setting N to any positive integer causes the worker to stop exactly at the configured boundary.
- **SC-007**: Setting MAXIMUM_DEPTH to any positive integer less than N causes the worker to stop at MAXIMUM_DEPTH — no email at a deeper position is ever processed, regardless of how many fetches or restarts occur.

## Clarifications

### Session 2026-03-08

- Q: Should the user see any indication that the background worker is active? → A: Silent — no UI feedback; worker runs invisibly.
- Q: Should the worker introduce an intentional delay between successive AI calls? → A: No intentional delay — requests are sent as fast as responses return.
- Q: How should the coverage limit N be configured? → A: Environment variable only (e.g., `SUMMARY_PRECOMPUTE_LIMIT=500`).

## Assumptions

- The existing summary storage and AI generation infrastructure (from feature 006) is available and working; this feature reuses it without modification.
- The app is a single-user desktop application; no multi-user or concurrent-session concerns apply.
- Emails in the cache have a stable, consistent ordering by date that the worker can rely on.
- The AI provider used for background generation is the same one used for manual 's' key generation (no separate provider configuration needed).
- N is configured via `SUMMARY_PRECOMPUTE_LIMIT`; MAXIMUM_DEPTH via `SUMMARY_PRECOMPUTE_MAX_DEPTH`. Both default to 500. A UI settings screen is out of scope.
