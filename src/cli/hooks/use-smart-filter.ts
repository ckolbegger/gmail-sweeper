import { useState, useCallback, useRef } from "react";
import type { Email } from "../../core/contracts/types.js";
import type { AiProvider } from "../../core/ai/provider.js";
import type { FilterResult } from "../../core/filter/smart-filter.js";
import { runSmartFilter } from "../../core/filter/smart-filter.js";
import { resolveAiConfig } from "../../core/ai/config.js";
import { createAiProvider } from "../../core/ai/provider.js";

export type FilterState = "idle" | "input" | "loading" | "filtered" | "error";

export interface UseSmartFilterResult {
  state: FilterState;
  filterDescription?: string;
  filteredResults?: FilterResult;
  error?: Error;
  activateFilter: () => void;
  submitFilter: (description: string, provider?: AiProvider) => Promise<void>;
  clearFilter: () => void;
}

export function useSmartFilter(emails: Email[]): UseSmartFilterResult {
  const [state, setState] = useState<FilterState>("idle");
  const [filterDescription, setFilterDescription] = useState<string>();
  const [filteredResults, setFilteredResults] = useState<FilterResult>();
  const [error, setError] = useState<Error>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const activateFilter = useCallback(() => {
    setState("input");
    setError(undefined);
  }, []);

  const submitFilter = useCallback(
    async (description: string, provider?: AiProvider) => {
      if (!description || !description.trim()) {
        setError(new Error("Filter description cannot be empty"));
        setState("error");
        return;
      }

      setState("loading");
      setError(undefined);

      try {
        const aiProvider = provider || createProviderFromConfig();

        if (!aiProvider) {
          throw new Error(
            "AI configuration is missing. Please set AI_PROVIDER, AI_MODEL, and AI_API_KEY environment variables.",
          );
        }

        abortControllerRef.current = new AbortController();

        const result = await runSmartFilter({
          description,
          emails,
          provider: aiProvider,
          signal: abortControllerRef.current.signal,
        });

        setFilterDescription(description);
        setFilteredResults(result);
        setState("filtered");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setState("error");
        setFilteredResults(undefined);
      }
    },
    [emails],
  );

  const clearFilter = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState("idle");
    setFilterDescription(undefined);
    setFilteredResults(undefined);
    setError(undefined);
  }, []);

  return {
    state,
    filterDescription,
    filteredResults,
    error,
    activateFilter,
    submitFilter,
    clearFilter,
  };
}

function createProviderFromConfig(): AiProvider | null {
  const config = resolveAiConfig();
  if (!config) {
    return null;
  }
  return createAiProvider(config);
}
