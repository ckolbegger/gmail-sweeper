/**
 * T021: useSmartFilter hook.
 *
 * State machine: idle → input → loading → filtered | error
 * Manages AI-powered email filtering with progressive results.
 */

import { useState, useCallback } from 'react';
import type { Email } from '../../core/models/index.js';
import type { ConfidenceLevel } from '../../core/ai/provider.js';
import { toConfidenceLevel, createAiProvider } from '../../core/ai/provider.js';
import { resolveAiConfig } from '../../core/ai/config.js';
import { runSmartFilter } from '../../core/filter/smart-filter.js';

type FilterStatus = 'idle' | 'input' | 'loading' | 'filtered' | 'error';

interface UseSmartFilterOptions {
  emails: Email[];
}

interface FilterProgress {
  evaluatedCount: number;
  totalCount: number;
  percent: number;
}

interface UseSmartFilterResult {
  status: FilterStatus;
  filterDescription: string;
  filteredEmails: Email[];
  confidenceMap: Map<string, ConfidenceLevel>;
  error: string | null;
  progress: FilterProgress | null;
  activateFilter: () => void;
  submitFilter: (description: string) => void;
  clearFilter: () => void;
}

export function useSmartFilter({
  emails,
}: UseSmartFilterOptions): UseSmartFilterResult {
  const [status, setStatus] = useState<FilterStatus>('idle');
  const [filterDescription, setFilterDescription] = useState('');
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [confidenceMap, setConfidenceMap] = useState<Map<string, ConfidenceLevel>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FilterProgress | null>(null);

  const activateFilter = useCallback(() => {
    setStatus('input');
  }, []);

  const submitFilter = useCallback(
    (description: string) => {
      setFilterDescription(description);
      setStatus('loading');
      setError(null);

      const config = resolveAiConfig();
      if (!config) {
        setStatus('error');
        setError('AI provider not configured');
        return;
      }

      const provider = createAiProvider(config);

      const filterOptions: Parameters<typeof runSmartFilter>[0] = {
        description,
        emails,
        provider,
        onProgress: (p) => {
          const percent = p.totalCount > 0
            ? Math.round((p.evaluatedCount / p.totalCount) * 100)
            : 0;
          setProgress({ evaluatedCount: p.evaluatedCount, totalCount: p.totalCount, percent });
        },
      };
      if (config.maxContextTokens !== undefined) {
        filterOptions.maxContextTokens = config.maxContextTokens;
      }

      runSmartFilter(filterOptions)
        .then((result) => {
          const matchingIds = new Set(
            result.matchingResults.map((r) => r.emailId),
          );
          const matched = emails.filter((e) => matchingIds.has(e.id));
          // Sort by confidence descending
          matched.sort((a, b) => {
            const confA =
              result.matchingResults.find((r) => r.emailId === a.id)
                ?.confidence ?? 0;
            const confB =
              result.matchingResults.find((r) => r.emailId === b.id)
                ?.confidence ?? 0;
            return confB - confA;
          });

          const newConfidenceMap = new Map<string, ConfidenceLevel>();
          for (const r of result.matchingResults) {
            newConfidenceMap.set(r.emailId, toConfidenceLevel(r.confidence));
          }

          setFilteredEmails(matched);
          setConfidenceMap(newConfidenceMap);
          setProgress(null);
          setStatus('filtered');
        })
        .catch((err: unknown) => {
          setProgress(null);
          setStatus('error');
          setError(
            err instanceof Error ? err.message : 'Unknown error occurred',
          );
        });
    },
    [emails],
  );

  const clearFilter = useCallback(() => {
    setStatus('idle');
    setFilterDescription('');
    setFilteredEmails([]);
    setConfidenceMap(new Map());
    setError(null);
    setProgress(null);
  }, []);

  return {
    status,
    filterDescription,
    filteredEmails,
    confidenceMap,
    error,
    progress,
    activateFilter,
    submitFilter,
    clearFilter,
  };
}
