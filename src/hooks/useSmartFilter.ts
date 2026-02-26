import { useState, useCallback, useRef, useEffect } from 'react';
import { Email } from '../types';
import { AiProvider, EmailClassification } from '../services/ai/provider';
import { runSmartFilter, FilterStatus, FilterProgress } from '../services/filter/smartFilter';

export function useSmartFilter(emails: Email[], provider: AiProvider | null) {
  const [status, setStatus] = useState<FilterStatus>('idle');
  const [results, setResults] = useState<EmailClassification[]>([]);
  const [progress, setProgress] = useState<FilterProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const applyFilter = useCallback(async (description: string) => {
    if (!provider) {
      setError('AI Provider not initialized');
      setStatus('error');
      return;
    }

    // Cancel any ongoing filter
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStatus('loading');
    setError(null);
    setResults([]);
    setProgress(null);

    try {
      const result = await runSmartFilter({
        description,
        emails,
        provider,
        onProgress: (p) => {
          setProgress(p);
          setResults(p.matchingResults);
        },
        signal: abortControllerRef.current.signal
      });

      setResults(result.matchingResults);
      setStatus('complete');
    } catch (err: any) {
      if (err.message === 'Filter cancelled' || err.name === 'AbortError') {
        // Do nothing for cancellation
        return;
      }
      setError(err.message || 'Smart filter failed');
      setStatus('error');
      throw err;
    }
  }, [emails, provider]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearFilter = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setResults([]);
    setProgress(null);
    setError(null);
  }, []);

  return {
    status,
    results,
    progress,
    error,
    applyFilter,
    clearFilter
  };
}
