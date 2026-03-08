/**
 * T028: Smart filter hook - manages filter state and execution
 */

import { useState, useCallback, useRef } from 'react';
import type { Email } from '../../core/models/index.js';
import { resolveAiConfig } from '../../core/ai/config.js';
import { createAiProvider } from '../../core/ai/provider.js';
import { createProviderConfig } from '../../core/ai/provider-utils.js';
import { runSmartFilter } from '../../core/filter/smart-filter.js';

export type FilterState = 'idle' | 'input' | 'loading' | 'filtered' | 'error';

export interface FilterProgress {
  evaluatedCount: number;
  totalCount: number;
  currentBatch: number;
  totalBatches: number;
}

export interface UseSmartFilterResult {
  filterState: FilterState;
  filterDescription: string;
  filteredEmails: Email[];
  filterError: string | null;
  confidenceMap: Map<string, 'high' | 'medium' | 'low'>;
  progress: FilterProgress | null;
  activateFilter: () => void;
  submitFilter: (description: string, allEmails: Email[]) => Promise<void>;
  clearFilter: () => void;
}

export function useSmartFilter(): UseSmartFilterResult {
  const [filterState, setFilterState] = useState<FilterState>('idle');
  const [filterDescription, setFilterDescription] = useState('');
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [confidenceMap, setConfidenceMap] = useState<Map<string, 'high' | 'medium' | 'low'>>(
    new Map()
  );
  const [progress, setProgress] = useState<FilterProgress | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const activateFilter = useCallback(() => {
    setFilterState('input');
    setFilterDescription('');
    setFilterError(null);
    setProgress(null);
  }, []);

  const clearFilter = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setFilterState('idle');
    setFilterDescription('');
    setFilteredEmails([]);
    setFilterError(null);
    setConfidenceMap(new Map());
    setProgress(null);
  }, []);

  const submitFilter = useCallback(async (description: string, allEmails: Email[]) => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setFilterError('Filter description cannot be empty');
      return;
    }

    console.error(
      '[useSmartFilter] Starting filter:',
      trimmedDesc,
      'with',
      allEmails.length,
      'emails'
    );

    const config = resolveAiConfig();
    console.error('[useSmartFilter] Config:', config);
    if (!config) {
      setFilterError('AI configuration not found. Please check your environment variables.');
      setFilterState('error');
      return;
    }

    abortControllerRef.current = new AbortController();
    setFilterDescription(trimmedDesc);
    setFilterState('loading');
    setFilterError(null);
    setProgress({
      evaluatedCount: 0,
      totalCount: allEmails.length,
      currentBatch: 0,
      totalBatches: 0,
    });

    try {
      const provider = createAiProvider(createProviderConfig(config));
      console.error('[useSmartFilter] Created provider, calling runSmartFilter...');

      const result = await runSmartFilter({
        provider,
        description: trimmedDesc,
        emails: allEmails,
        signal: abortControllerRef.current.signal,
        onProgress: (prog) => {
          console.error(
            '[useSmartFilter] Progress:',
            prog.evaluatedCount,
            '/',
            prog.totalCount,
            'batch',
            prog.currentBatch,
            '/',
            prog.totalBatches
          );
          setProgress({
            evaluatedCount: prog.evaluatedCount,
            totalCount: prog.totalCount,
            currentBatch: prog.currentBatch,
            totalBatches: prog.totalBatches,
          });
        },
      });

      console.error('[useSmartFilter] Filter complete. Matches:', result.matchingResults.length);

      const matchingIds = new Set(result.matchingResults.map((r) => r.emailId));
      const filtered = allEmails.filter((email) => matchingIds.has(email.id));

      const newConfidenceMap = new Map<string, 'high' | 'medium' | 'low'>();
      result.matchingResults.forEach((r) => {
        newConfidenceMap.set(r.emailId, r.confidenceLevel);
      });

      setFilteredEmails(filtered);
      setConfidenceMap(newConfidenceMap);
      setFilterState('filtered');
      setProgress(null);
    } catch (error) {
      console.error('[useSmartFilter] Error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setFilterError(error instanceof Error ? error.message : 'Filter failed');
      setFilterState('error');
      setProgress(null);
    }
  }, []);

  return {
    filterState,
    filterDescription,
    filteredEmails,
    filterError,
    confidenceMap,
    progress,
    activateFilter,
    submitFilter,
    clearFilter,
  };
}
