import { useState, useRef, useCallback, useMemo } from 'react';
import type { Email } from '../../core/models/index.js';
import type { EmailSummary } from '../../core/models/index.js';
import type { EmailCache } from '../../core/cache/db.js';
import type { AiProviderConfig } from '../../core/ai/provider.js';
import { SummaryService } from '../../core/summary/service.js';

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
   * - Cache hit: transitions to 'ready' without AI call.
   * - Cache miss: transitions to 'loading', calls AI, then 'ready' or 'error'.
   * - No-op if already loading.
   */
  requestSummary: (email: Email) => void;
  /** Reset state to idle (call when selected email changes). */
  reset: () => void;
}

const INITIAL_STATE: SummaryState = {
  status: 'idle',
  summary: null,
  error: null,
};

export function useEmailSummary({ cache, aiConfig }: UseEmailSummaryOptions): UseEmailSummaryResult {
  const [summaryState, setSummaryState] = useState<SummaryState>(INITIAL_STATE);
  // Ref guards concurrent requestSummary calls without stale-closure risk from state reads
  const isLoadingRef = useRef(false);
  // Generation counter — incremented on each new request and on reset.
  // Promise callbacks check their captured id against the current value and discard
  // results that belong to a superseded request (stale navigation race fix).
  const requestIdRef = useRef(0);
  // Stable service instance — recreated only when aiConfig changes
  const service = useMemo(() => (aiConfig ? new SummaryService(aiConfig) : null), [aiConfig]);

  const requestSummary = useCallback(
    (email: Email) => {
      // No-op if already loading
      if (isLoadingRef.current) return;

      // No AI config
      if (!service) {
        setSummaryState({ status: 'error', summary: null, error: 'AI not configured' });
        return;
      }

      // Check cache first
      const cached = cache.getSummary(email.id);
      if (cached) {
        setSummaryState({ status: 'ready', summary: cached, error: null });
        return;
      }

      // Start loading — capture the current generation id in the closure
      const myId = ++requestIdRef.current;
      isLoadingRef.current = true;
      setSummaryState({ status: 'loading', summary: null, error: null });

      service
        .summarize(email)
        .then(summary => {
          if (requestIdRef.current !== myId) return; // stale — discard
          cache.setSummary(summary);
          setSummaryState({ status: 'ready', summary, error: null });
        })
        .catch((err: unknown) => {
          if (requestIdRef.current !== myId) return; // stale — discard
          const message = err instanceof Error ? err.message : 'Unknown error occurred';
          setSummaryState({ status: 'error', summary: null, error: message });
        })
        .finally(() => {
          // Only clear the guard if this request is still the active one
          if (requestIdRef.current === myId) isLoadingRef.current = false;
        });
    },
    [cache, service],
  );

  const reset = useCallback(() => {
    requestIdRef.current++; // invalidate any in-flight request
    isLoadingRef.current = false;
    setSummaryState(INITIAL_STATE);
  }, []);

  return { summaryState, requestSummary, reset };
}
