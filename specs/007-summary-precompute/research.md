# Research: Background Summary Precomputation

**Feature**: 007-summary-precompute
**Date**: 2026-03-08

---

## R-001: Background Async Worker Pattern in Node.js/TypeScript

**Decision**: Single-pass async iterator with `AbortController` cancellation.

**Rationale**: The codebase already uses `AbortSignal` for cancellation in `src/core/filter/smart-filter.ts`. An async loop that checks `signal.aborted` between iterations is the idiomatic pattern — zero new dependencies, fully unit-testable by calling `abort()` mid-loop.

**Alternatives considered**:
- Worker threads: adds cross-thread serialisation complexity; not needed since AI calls are already async I/O
- Node streams: overkill for a sequential per-email pipeline
- `setInterval` polling: harder to cancel cleanly; mismatches async AI calls

---

## R-002: Email Ordering for the Worker Pass

**Decision**: Use `cache.getEmails({ sortBy: 'date', sortDesc: true, limit: effectiveDepth })` where `effectiveDepth = Math.min(coverageLimit, maxDepth)`.

**Rationale**: `EmailCache.getEmails()` already supports date-descending order with a `limit` parameter, backed by a native SQLite index (`idx_emails_date`). No new query methods needed.

**Alternatives considered**:
- Fetch all emails then slice: wastes memory on large caches
- Custom SQL query: unnecessary given existing `getEmails` API

---

## R-003: Cancellation and Restart-on-Fetch Integration

**Decision**: `PrecomputeWorker` owns an `AbortController` internally; `restart()` calls `abort()` on the current controller, creates a new one, and begins a fresh pass.

**Rationale**: Mirrors the existing smart-filter cancellation pattern. `app.tsx` passes `worker.restart` as a callback into `useGmail`'s `loadMore()` completion path. No new state management primitives needed.

**Alternatives considered**:
- Cancellation token objects: more complex, no benefit over native AbortSignal
- React ref held in app.tsx: same effect, but worker owning its own controller is cleaner (core module, no UI coupling)

---

## R-004: SummaryService Reuse

**Decision**: `PrecomputeWorker` takes a `SummaryService` instance via constructor injection. The same instance used for manual 's' key summarisation is passed in.

**Rationale**: `SummaryService` is stateless beyond its `AiProviderConfig`. Sharing the instance avoids duplicate config parsing and is consistent with spec Assumption: "same AI provider as manual flow."

**Alternatives considered**:
- Worker creates its own `SummaryService`: wasteful; doubles config parsing; could use different provider if misconfigured
- Global singleton: anti-pattern, harder to test

---

## R-005: Persistence of Results

**Decision**: Call `cache.setSummary(summary)` immediately after each successful AI response; no batching.

**Rationale**: `setSummary` is a simple upsert with minimal overhead. Writing immediately means partial progress survives app crashes. `EmailCache` auto-saves to disk via `saveDatabase()` which is called on `close()`.

**Alternatives considered**:
- Batch writes every N summaries: small performance gain but partial loss risk if app crashes mid-batch
- Write all at end of pass: worst resilience; loses entire pass on crash

---

## R-006: Configuration via Environment Variables

**Decision**: Read `SUMMARY_PRECOMPUTE_LIMIT` and `SUMMARY_PRECOMPUTE_MAX_DEPTH` from `process.env` at worker construction time, falling back to 500.

**Rationale**: Consistent with how `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` are read in the existing codebase. Simple, no new config parsing infrastructure needed.

**Alternatives considered**:
- CLI flags: would require changes to Commander.js arg parsing and launchTUI signature
- Config file: unnecessary indirection for two integers

---

## R-007: Worker Lifecycle — Where to Instantiate

**Decision**: Instantiate `PrecomputeWorker` in `src/tui/index.tsx` (inside `launchTUI()`) after `cache.initialize()`, alongside the `SummaryService`. Pass `worker` as a prop to `InboxApp`.

**Rationale**: `launchTUI()` is already the bootstrap point that holds both `cache` and `service` references. Starting the worker here ensures it begins immediately on app launch without coupling the worker to React lifecycle.

**Alternatives considered**:
- Instantiate inside `app.tsx` as a React ref: creates tight UI/core coupling; React re-renders should not restart a worker
- Instantiate in `src/cli/index.ts`: too far from cache; requires passing through more layers

---

## R-008: Error Handling per Email

**Decision**: Wrap each `service.summarize(email)` call in try/catch. On `SummaryGenerationError`, log to stderr and continue. Rate-limit errors (HTTP 429) are caught and retried with exponential back-off (max 3 attempts, 1s/2s/4s delays).

**Rationale**: The spec requires per-email fault tolerance (FR-011) and rate-limit back-off (FR-012). Distinguishing `SummaryGenerationError` from rate-limit errors is possible via error type/status code inspection, consistent with existing `SummaryGenerationError` usage.

**Alternatives considered**:
- Abort entire pass on any error: violates FR-011
- Unlimited retries: could hang indefinitely; 3 attempts with back-off is a practical ceiling

---

## R-009: Testing Strategy

**Decision**: Unit tests mock `EmailCache` and `SummaryService`. Integration test uses a real `EmailCache` with `tmp` directory (identical to existing cache tests). No real AI calls in tests.

**Rationale**: Mirrors test patterns in `tests/unit/cache/`, `tests/unit/summary/`, and `tests/integration/`. Vitest + `vi.fn()` mocking is already established.

**Key test scenarios**:
- Worker processes only emails without summaries (skips cached ones)
- Worker stops at `effectiveDepth = min(N, MAXIMUM_DEPTH)`
- `restart()` cancels an in-progress pass
- Per-email error is skipped; worker completes remaining emails
- Rate-limit error triggers back-off and retry
