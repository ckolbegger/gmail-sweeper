/**
 * useSmartFilter Hook
 *
 * React hook for managing smart filter state and operations.
 * Handles AI-powered email filtering with natural language descriptions.
 *
 * T036: Supports cancellation via AbortController when clearing filter.
 * T040: Returns classifications with confidence levels for UI display.
 */

import { useState, useCallback, useRef } from 'react';
import type { Email } from '@/core/models/email.js';
import { runSmartFilter } from '@/core/filter/smart-filter.js';
import { createAiProvider, type AiProvider, type EmailClassification } from '@/core/ai/provider.js';
import { resolveAiConfig } from '@/core/ai/config.js';

export type SmartFilterState = 'idle' | 'input' | 'loading' | 'filtered' | 'error';

export interface FilterProgress {
  current: number;
  total: number;
}

export interface UseSmartFilterReturn {
  state: SmartFilterState;
  description: string | null;
  filteredEmails: Email[];
  /** Classifications with confidence levels (T040) */
  classifications: EmailClassification[];
  error: string | null;
  progress: FilterProgress | null;
  activateFilter: () => void;
  submitFilter: (description: string, emails: Email[]) => Promise<void>;
  clearFilter: () => void;
}

/**
 * Hook for managing smart filter state and AI-powered email filtering.
 *
 * State transitions:
 * - idle -> input (activateFilter)
 * - input -> loading (submitFilter)
 * - loading -> filtered (success) or error (failure)
 * - filtered/error -> idle (clearFilter)
 * - any -> idle (clearFilter)
 *
 * FR-017: Missing config shows error message
 * T036: Clearing during loading aborts in-flight evaluation
 * T040: Returns classifications for confidence display
 */
export function useSmartFilter(): UseSmartFilterReturn {
  const [state, setState] = useState<SmartFilterState>('idle');
  const [description, setDescription] = useState<string | null>(null);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [classifications, setClassifications] = useState<EmailClassification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FilterProgress | null>(null);

  // Track AbortController for cancelling in-flight operations
  const abortControllerRef = useRef<AbortController | null>(null);

  const activateFilter = useCallback(() => {
    setState('input');
    setError(null);
    setProgress(null);
  }, []);

  const submitFilter = useCallback(async (desc: string, emails: Email[]) => {
    // Validate description
    if (!desc || desc.trim() === '') {
      setError('Filter description cannot be empty');
      setState('error');
      return;
    }

    // Check for AI configuration (FR-017)
    const config = resolveAiConfig();
    if (!config) {
      setError('AI provider not configured. Set AI_PROVIDER and AI_API_KEY environment variables.');
      setState('error');
      return;
    }

    setState('loading');
    setDescription(desc);
    setError(null);
    setProgress({ current: 0, total: emails.length });

    // Create AbortController for cancellation support (T036)
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentSignal = abortController.signal;

    try {
      const provider: AiProvider = createAiProvider(config);
      const result = await runSmartFilter({
        emails,
        description: desc,
        provider,
        maxContextTokens: config.maxContextTokens,
        signal: currentSignal,
        onProgress: (processed, total) => {
          // Only update progress if not aborted
          if (!currentSignal.aborted) {
            setProgress({ current: processed, total });
          }
        },
      });

      // Only update state if not aborted (T036)
      if (!currentSignal.aborted) {
        setFilteredEmails(result.filteredEmails);
        setClassifications(result.classifications); // T040: Store classifications
        setProgress(null);
        setState('filtered');
      }
    } catch (err) {
      // Only set error if not aborted (T036)
      if (!currentSignal.aborted) {
        setProgress(null);
        setError(err instanceof Error ? err.message : 'Smart filter failed');
        setState('error');
      }
    } finally {
      // Clear the ref if this is still the current controller
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const clearFilter = useCallback(() => {
    // Abort any in-flight operation (T036)
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = null;

    setState('idle');
    setDescription(null);
    setFilteredEmails([]);
    setClassifications([]); // T040: Clear classifications
    setError(null);
    setProgress(null);
  }, []);

  return {
    state,
    description,
    filteredEmails,
    classifications, // T040: Return classifications
    error,
    progress,
    activateFilter,
    submitFilter,
    clearFilter,
  };
}
