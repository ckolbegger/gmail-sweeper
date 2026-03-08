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

      // Start loading
      isLoadingRef.current = true;
      setSummaryState({ status: 'loading', summary: null, error: null });

      service
        .summarize(email)
        .then(summary => {
          cache.setSummary(email.id, summary);
          setSummaryState({ status: 'ready', summary, error: null });
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error occurred';
          setSummaryState({ status: 'error', summary: null, error: message });
        })
        .finally(() => {
          isLoadingRef.current = false;
        });
    },
    [cache, service],
  );

  const reset = useCallback(() => {
    isLoadingRef.current = false;
    setSummaryState(INITIAL_STATE);
  }, []);

  return { summaryState, requestSummary, reset };
}
