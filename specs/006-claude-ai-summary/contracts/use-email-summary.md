# Contract: useEmailSummary Hook

**File**: `src/tui/hooks/useEmailSummary.ts`

## Interface

```typescript
import type { Email } from '../../core/models/index.js';
import type { EmailSummary } from '../../core/models/index.js';
import type { EmailCache } from '../../core/cache/db.js';
import type { AiProviderConfig } from '../../core/ai/provider.js';

export type SummaryStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface SummaryState {
  status: SummaryStatus;
  summary: EmailSummary | null;
  error: string | null;
}

export interface UseEmailSummaryOptions {
  cache: EmailCache;
  aiConfig: AiProviderConfig | null;
}

export interface UseEmailSummaryResult {
  summaryState: SummaryState;
  /**
   * Request a summary for the given email.
   * - If cache hit: transitions to 'ready' synchronously (via state).
   * - If cache miss: transitions to 'loading', calls AI, then 'ready' or 'error'.
   * - If aiConfig is null: sets error 'AI not configured'.
   * - No-op if already loading.
   */
  requestSummary: (email: Email) => void;
  /** Reset state to idle (call when selected email changes). */
  reset: () => void;
}

export function useEmailSummary(options: UseEmailSummaryOptions): UseEmailSummaryResult {}
```

## Behaviour Contract

| Scenario | Pre-state | Action | Post-state |
|----------|-----------|--------|------------|
| Cache hit | `idle` | `requestSummary(email)` | `ready` (no AI call) |
| Cache miss | `idle` | `requestSummary(email)` | `loading` → `ready` |
| AI failure | `loading` | AI throws | `error` with message |
| Retry after error | `error` | `requestSummary(email)` | `loading` → `ready` or `error` |
| Email changes | any | `reset()` | `idle`, `summary: null`, `error: null` |
| No AI config | `idle` | `requestSummary(email)` | `error: 'AI not configured'` |
| Already loading | `loading` | `requestSummary(email)` | no-op |
