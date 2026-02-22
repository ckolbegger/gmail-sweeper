/**
 * useSmartFilter Hook
 *
 * React hook for managing smart filter state and operations.
 * Handles AI-powered email filtering with natural language descriptions.
 */

import { useState, useCallback } from 'react';
import type { Email } from '@/core/models/email.js';
import { runSmartFilter } from '@/core/filter/smart-filter.js';
import { createAiProvider, type AiProvider } from '@/core/ai/provider.js';
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
 */
export function useSmartFilter(): UseSmartFilterReturn {
  const [state, setState] = useState<SmartFilterState>('idle');
  const [description, setDescription] = useState<string | null>(null);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FilterProgress | null>(null);

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

    try {
      const provider: AiProvider = createAiProvider(config);
      const result = await runSmartFilter({
        emails,
        description: desc,
        provider,
        maxContextTokens: config.maxContextTokens,
        onProgress: (processed, total) => {
          setProgress({ current: processed, total });
        },
      });

      setFilteredEmails(result.filteredEmails);
      setProgress(null);
      setState('filtered');
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : 'Smart filter failed');
      setState('error');
    }
  }, []);

  const clearFilter = useCallback(() => {
    setState('idle');
    setDescription(null);
    setFilteredEmails([]);
    setError(null);
    setProgress(null);
  }, []);

  return {
    state,
    description,
    filteredEmails,
    error,
    progress,
    activateFilter,
    submitFilter,
    clearFilter,
  };
}
