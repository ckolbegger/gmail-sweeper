# Contract: PrecomputeWorker

**Module**: `src/core/summary/precompute-worker.ts`
**Exported from**: `src/core/summary/index.ts`
**Feature**: 007-summary-precompute

---

## Purpose

Manages a background async pass over the email cache, generating AI summaries for emails that don't yet have one. Processes emails from newest to oldest, stopping once `effectiveDepth = min(coverageLimit, maxDepth)` emails have been examined. Supports cancellation and restart.

---

## Exports

### `PrecomputeConfig`

```typescript
interface PrecomputeConfig {
  /** How many of the newest emails the worker aims to cover. Default: 500. */
  coverageLimit: number;
  /** Absolute position ceiling — never process email at index >= maxDepth. Default: 500. */
  maxDepth: number;
}
```

### `readPrecomputeConfig(): PrecomputeConfig`

Reads `SUMMARY_PRECOMPUTE_LIMIT` and `SUMMARY_PRECOMPUTE_MAX_DEPTH` from `process.env`, applying defaults of 500 for each. Returns a validated `PrecomputeConfig`.

**Validation**: Both values must be positive integers. Invalid/missing values fall back to 500 (not an error).

---

### `PrecomputeWorker`

```typescript
class PrecomputeWorker {
  constructor(
    cache: EmailCache,
    service: SummaryService,
    config: PrecomputeConfig
  )

  /** Start the first worker pass. No-op if already running. */
  start(): void

  /**
   * Cancel any in-progress pass and immediately begin a fresh pass from the
   * top of the inbox. Safe to call when idle (acts like start()).
   */
  restart(): void

  /** Cancel any in-progress pass and do not start a new one. */
  stop(): void
}
```

---

## Worker Pass Algorithm

On each pass:

1. Create a new `AbortController`; store signal as current cancellation token.
2. Fetch `emails = cache.getEmails({ sortBy: 'date', sortDesc: true, limit: effectiveDepth })`.
3. For each email in order (index 0 … effectiveDepth-1):
   a. If `signal.aborted` → exit loop (pass cancelled).
   b. If `cache.getSummary(email.id) !== null` → skip (already cached).
   c. Attempt `service.summarize(email)`:
      - On success → `cache.setSummary(summary)`.
      - On rate-limit error (HTTP 429 / `SummaryGenerationError` with retryable flag) → exponential back-off (1s, 2s, 4s), max 3 attempts. If all attempts fail, skip email and continue.
      - On other `SummaryGenerationError` → skip email, log to stderr, continue.
4. Mark worker state as `idle`.

---

## Behaviour Contract

| Scenario | Expected Behaviour |
|---|---|
| `start()` when idle | Begins pass immediately |
| `start()` when running | No-op (pass already in progress) |
| `restart()` when idle | Begins pass (same as `start()`) |
| `restart()` when running | Cancels current pass; starts new pass |
| `stop()` when running | Cancels current pass; remains idle |
| Email already has summary | Skipped — no AI call |
| AI generation error (non-retryable) | Skip email; continue to next |
| Rate-limit error | Back-off + retry up to 3×; skip if all fail |
| Pass completes normally | Worker becomes idle |
| `effectiveDepth = min(N, MAXIMUM_DEPTH)` | Always respected — no email at index ≥ effectiveDepth is touched |

---

## Integration Points

### App bootstrap (`src/tui/index.tsx`)

```typescript
const worker = new PrecomputeWorker(cache, summaryService, readPrecomputeConfig());
worker.start();
// Pass worker to InboxApp so it can call worker.restart() on loadMore
```

### On new emails fetched (`src/tui/app.tsx` → `useGmail`)

When `loadMore()` completes successfully, call `worker.restart()`. This is wired via an `onEmailsFetched` callback option added to `useGmail`.

---

## Error Isolation

`PrecomputeWorker` MUST NOT throw unhandled exceptions. All errors are caught internally. The caller (app bootstrap) does not need to attach `.catch()` handlers.

---

## Not in Scope

- UI notification of worker status (silent operation per clarification Q1)
- Intentional inter-call delay (none, per clarification Q2)
- Manual 's' key flow — PrecomputeWorker has no interaction with `useEmailSummary`; they share the cache independently
