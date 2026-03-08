# Remediation Tasks: AI Email Summary (spec-006)

**Source**: Post-implementation code review findings
**Branch**: `006-claude-ai-summary`
**Test command**: `npm test` (must stay green after every task)

---

## R001 — Fix stale in-flight promise race condition in `useEmailSummary`

**File**: `src/tui/hooks/useEmailSummary.ts`

**Problem**
When the user navigates away from email A while its summary is loading, `reset()` is called — which sets `isLoadingRef.current = false` and clears state to `idle`. However, the in-flight promise for email A continues running. Two failure modes follow:

1. **State corruption**: If the user then presses 's' on email B (starting B's request, setting `isLoadingRef = true`), email A's promise resolves first and calls `setSummaryState({ status: 'ready', summary: emailA_summary })` — showing the wrong email's summary while B is loading.
2. **Duplicate request**: Email A's `.finally` runs and sets `isLoadingRef.current = false`, clearing the guard that was protecting B's in-flight request. If the user presses 's' again, a duplicate request for B is started.

**Fix**
Add a generation counter ref (`requestIdRef: useRef(0)`). Increment it at the start of each new request. Capture the current generation id in the closure. In `.then`, `.catch`, and `.finally`, no-op if the captured id no longer matches `requestIdRef.current`.

```typescript
// Sketch — implement in useEmailSummary.ts
const requestIdRef = useRef(0);

// Inside requestSummary, after the loading guard:
const myId = ++requestIdRef.current;

service.summarize(email)
  .then(summary => {
    if (requestIdRef.current !== myId) return;   // stale — discard
    cache.setSummary(email.id, summary);
    setSummaryState({ status: 'ready', summary, error: null });
  })
  .catch((err: unknown) => {
    if (requestIdRef.current !== myId) return;   // stale — discard
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    setSummaryState({ status: 'error', summary: null, error: message });
  })
  .finally(() => {
    if (requestIdRef.current === myId) isLoadingRef.current = false;
  });
```

`reset()` should also increment `requestIdRef.current` to invalidate any in-flight request:

```typescript
const reset = useCallback(() => {
  requestIdRef.current++;          // invalidate any in-flight request
  isLoadingRef.current = false;
  setSummaryState(INITIAL_STATE);
}, []);
```

**Tests to add** in `tests/unit/tui/useEmailSummary.test.ts`:

- `stale promise ignored after reset()`: Start loading email A (delayed resolution). Call `reset()`. Resolve email A's promise. Assert state is still `idle`, not `ready`. Assert `cache.setSummary` is NOT called.
- `stale promise ignored after second request starts`: Start loading email A (delayed). Start loading email B (both in flight). Resolve email A's promise first. Assert state stays `loading`. Resolve email B. Assert state is `ready` with email B's summary.
- `finally does not clear isLoadingRef when stale`: As above — after resolving email A stale, confirm a subsequent `requestSummary(emailB)` call is not treated as a no-op (i.e., `isLoadingRef` is still true for B's request).

---

## R002 — Handle corrupt `action_items_json` in `EmailCache.getSummary`

**File**: `src/core/cache/db.ts` — `getSummary` method (around line 339)

**Problem**
`JSON.parse(row.action_items_json as string)` throws a `SyntaxError` if the stored value is not valid JSON. This is not caught anywhere in `getSummary` or its callers. Although the `useEmailSummary` hook's `.catch` would eventually handle it, the error message would be cryptic and the cache entry is now permanently unreadable.

**Fix**
Wrap the `JSON.parse` call in a try/catch inside `getSummary`. On parse failure, treat it as a cache miss (return `null`) and optionally log a warning. Do NOT silently swallow the error without the null return — returning `null` causes the caller to fall through to a fresh AI request, which is the correct recovery path.

```typescript
// In getSummary, replace the direct JSON.parse with:
let actionItems: string[];
try {
  actionItems = JSON.parse(row.action_items_json as string) as string[];
} catch {
  // Corrupt cache entry — treat as miss so a fresh summary is generated
  stmt.free();
  return null;
}
```

**Tests to add** in `tests/unit/cache/summary-cache.test.ts`:

- `corrupt action_items_json returns null`: Manually insert a row via `db.run(INSERT ...)` with `action_items_json = 'not-json'`, then call `getSummary(emailId)` and assert it returns `null` (not throws).

---

## R003 — Validate `AI_PROVIDER` env var; reject unknown providers explicitly

**Files**:
- `src/core/ai/config.ts` — `resolveAiConfig()`
- `src/core/summary/service.ts` — `SummaryService.summarize()`

**Problem**
`resolveAiConfig()` does `provider as 'anthropic' | 'openai'` without validating the string. If `AI_PROVIDER=gemini` (or any unrecognised value) is set, the cast silently succeeds. In `SummaryService.summarize()`, the branch `if (this.config.provider === 'anthropic')` fails, and the code falls through to the `else` branch which unconditionally creates an OpenAI client — producing a confusing OpenAI SDK error ("Invalid API key" or "Unknown model") instead of a clear "unsupported provider" message.

**Fix in `config.ts`**
Add an explicit allowlist check before returning:

```typescript
const SUPPORTED_PROVIDERS = ['anthropic', 'openai'] as const;

export function resolveAiConfig(): AiProviderConfig | null {
  const provider = process.env['AI_PROVIDER'];
  const apiKey = process.env['AI_API_KEY'];

  if (!provider || !apiKey) return null;

  if (!SUPPORTED_PROVIDERS.includes(provider as 'anthropic' | 'openai')) {
    // Return null so callers display "AI not configured" rather than crashing
    return null;
  }
  // ... rest unchanged
}
```

**Fix in `service.ts`**
Change the else-branch to an explicit `else if` with a hard throw on the default:

```typescript
if (this.config.provider === 'anthropic') {
  // ... existing Anthropic branch
} else if (this.config.provider === 'openai') {
  // ... existing OpenAI branch
} else {
  throw new SummaryGenerationError(
    `Unsupported AI provider: ${String(this.config.provider)}. Supported: anthropic, openai`
  );
}
```

**Tests to add** in `tests/unit/ai/config.test.ts` (or a new `tests/unit/summary/service.test.ts` section):

- `resolveAiConfig returns null for unknown provider`: Set env vars `AI_PROVIDER=gemini`, `AI_API_KEY=key`. Assert return is `null`.
- `SummaryService throws SummaryGenerationError for unsupported provider`: Construct a `SummaryService` with `{ provider: 'gemini' as any, ... }` and call `summarize(email)`. Assert it rejects with `SummaryGenerationError` and message contains "Unsupported AI provider".

---

## R004 — Fix `handleToggleSummary` no-op when no email is selected

**File**: `src/tui/app.tsx` — `handleToggleSummary` callback (around line 61)

**Problem**
When `displayEmails` is empty (no email is selected), pressing 's' still calls `setDetailViewMode('summary')`. Although `EmailPreview` short-circuits at the `if (!email)` check and shows "No email selected", `detailViewMode` is now stuck at `'summary'`. The next time an email is selected (e.g., after emails load), it will immediately appear in summary mode without the user pressing 's', which is unexpected.

**Fix**
Guard at the top of `handleToggleSummary` before any state changes:

```typescript
const handleToggleSummary = useCallback(() => {
  if (!selectedEmailRef.current) return;   // no-op when nothing is selected

  if (detailViewMode === 'full') {
    setDetailViewMode('summary');
    requestEmailSummary(selectedEmailRef.current);
  } else {
    setDetailViewMode('full');
  }
}, [detailViewMode, requestEmailSummary]);
```

**Tests to add** in `tests/unit/tui/useKeyboard.summary.test.ts` or a new `app.tsx` unit test:

- `'s' key is a no-op when itemCount is 0`: Render `useKeyboard` with `itemCount=0` and `onToggleSummary` spy. Simulate 's' keypress. Assert `onToggleSummary` was NOT called. (Note: `useKeyboard` already guards `input === 's' && itemCount > 0`, so this is already handled at the keyboard level. The additional guard in `handleToggleSummary` is belt-and-suspenders for direct callers.)
- `detailViewMode stays 'full' when no email is selected`: Write an app-level test (or integration test with an empty email list) that simulates pressing 's' and confirms `detailViewMode` does not change to `'summary'`.

---

## R005 — Remove unreachable `SummaryGenerationError` re-throw guard in `SummaryService`

**File**: `src/core/summary/service.ts` — `summarize()` method (around line 45–46)

**Problem**
The catch block inside `summarize()` contains:

```typescript
} catch (err) {
  if (err instanceof SummaryGenerationError) throw err;
  throw new SummaryGenerationError(...)
}
```

The guard `if (err instanceof SummaryGenerationError) throw err` is dead code. `parseSummaryResponse()` — the only place that throws `SummaryGenerationError` — is called on line 53, **outside** the try/catch block. Only SDK errors (Anthropic/OpenAI API call failures) are caught here; `SummaryGenerationError` can never enter this catch handler. The misleading guard implies a code path that does not exist.

**Fix**
Remove the guard. The catch block becomes simply:

```typescript
} catch (err) {
  throw new SummaryGenerationError(
    `AI provider error: ${(err as Error).message}`,
    err as Error,
  );
}
```

No new tests required — existing service tests cover this path. Run `npm test` to confirm no regressions.

---

## R006 — Use `bodyHtml` (stripped) when `bodyText` is absent in `buildSummaryPrompt`

**File**: `src/core/summary/prompt.ts` — `buildSummaryPrompt()` (line 18)

**Problem**
The current fallback chain is `email.bodyText ?? email.snippet ?? ''`. For emails that have only `bodyHtml` (many modern HTML emails have no plain-text alternative), the AI receives at most 100 chars of snippet instead of the full email content, producing low-quality summaries.

The project already has `processEmailBody` in `src/core/text/body-formatter.ts` which handles HTML stripping and formatting, but it is a TUI-rendering utility (returns `ProcessedLine[]`, respects terminal width). It is **not** appropriate to call it directly from `buildSummaryPrompt`.

**Fix**
Add a lightweight HTML-to-plaintext helper in `src/core/summary/prompt.ts` (or import a small utility). A minimal implementation that strips tags is sufficient — the AI handles imperfect text well:

```typescript
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // remove script blocks
    .replace(/<br\s*\/?>/gi, '\n')                      // br → newline
    .replace(/<\/p>/gi, '\n\n')                         // paragraph breaks
    .replace(/<[^>]+>/g, '')                            // strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')                         // collapse excess newlines
    .trim();
}
```

Update the fallback chain:

```typescript
const bodyText =
  email.bodyText ??
  (email.bodyHtml ? htmlToText(email.bodyHtml) : null) ??
  email.snippet ??
  '';
```

**Tests to add** in `tests/unit/summary/prompt.test.ts`:

- `uses bodyText when available (HTML present but ignored)`: Email has both `bodyText` and `bodyHtml`. Assert prompt contains `bodyText` content.
- `strips bodyHtml to plain text when bodyText absent`: Email has `bodyHtml = '<p>Hello <b>world</b></p>'`, no `bodyText`. Assert prompt contains `'Hello world'` (tags stripped).
- `falls back to snippet when both body fields absent`: Email has no `bodyText`, no `bodyHtml`, but has `snippet`. Assert prompt contains the snippet.
- `uses empty string when all body fields absent`: Email has no `bodyText`, `bodyHtml`, or `snippet`. Assert prompt does not throw and body section is empty.

---

## R007 — Remove redundant `emailId` parameter from `EmailCache.setSummary`

**File**: `src/core/cache/db.ts` — `setSummary` method (around line 351)

**Problem**
The current signature is `setSummary(emailId: string, summary: EmailSummary)`, where `EmailSummary` already contains `summary.emailId`. The `emailId` parameter is used as the SQLite primary key, but `summary.emailId` is ignored. The API is ambiguous: a caller that passes `cache.setSummary('wrong-id', summary)` would store the summary under the wrong key with no error.

In practice, all current call sites pass the same ID in both places (`useEmailSummary.ts:72`: `cache.setSummary(email.id, summary)`, where `summary.emailId === email.id`), so there is no current data corruption. However, the redundancy is a latent bug for future callers.

**Fix**
Remove the redundant `emailId` parameter. Derive it from `summary.emailId`:

```typescript
setSummary(summary: EmailSummary): void {
  this.ensureInitialized();

  const stmt = this.db.prepare(`
    INSERT OR REPLACE INTO email_summaries (email_id, one_sentence, action_items_json, generated_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.bind([
    summary.emailId,                          // derived from summary, not a separate param
    summary.oneSentence,
    JSON.stringify(summary.actionItems),
    summary.generatedAt.toISOString(),
  ]);
  stmt.step();
  stmt.free();

  this.saveDatabase();
}
```

**Call site update** — change `useEmailSummary.ts:72` from:
```typescript
cache.setSummary(email.id, summary);
```
to:
```typescript
cache.setSummary(summary);
```

**Also update** the `EmailCache` type in any interface/mock usages (check `tests/unit/tui/useEmailSummary.test.ts` `makeMockCache()` — update the `setSummary` mock signature to `(s: EmailSummary) => void`).

**Tests**: Update existing `summary-cache.test.ts` tests to use the new single-argument signature. Add one new test:

- `setSummary uses summary.emailId as the storage key`: Call `setSummary(summary)` where `summary.emailId = 'abc'`. Then call `getSummary('abc')`. Assert the summary is returned. Assert `getSummary('other-id')` returns `null`.
