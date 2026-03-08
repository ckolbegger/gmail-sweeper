/**
 * T011: AI Summary hook - manages summary generation for emails
 */

import { useState, useCallback, useRef } from 'react';
import type { Email, EmailSummary } from '../../core/models/index.js';
import type { EmailCache } from '../../core/cache/db.js';
import { resolveAiConfig } from '../../core/ai/config.js';
import { createAiProvider } from '../../core/ai/provider.js';
import { createProviderConfig } from '../../core/ai/provider-utils.js';
import { convertHtmlToText } from '../../core/rendering/index.js';

export type SummaryState = 'idle' | 'loading' | 'success' | 'error';

export interface UseAISummaryOptions {
  cache?: EmailCache;
}

export interface UseAISummaryResult {
  summaryState: SummaryState;
  summaryError: string | null;
  generateSummary: (email: Email) => Promise<EmailSummary | null>;
  abortGeneration: () => void;
}

export function useAISummary({ cache }: UseAISummaryOptions = {}): UseAISummaryResult {
  const [summaryState, setSummaryState] = useState<SummaryState>('idle');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateSummary = useCallback(
    async (email: Email): Promise<EmailSummary | null> => {
      if (email.summary) {
        return email.summary;
      }

      if (!email.bodyText && !email.bodyHtml) {
        setSummaryError('Email has no body content to summarize');
        setSummaryState('error');
        return null;
      }

      const config = resolveAiConfig();
      if (!config) {
        setSummaryError('AI configuration not found. Please check your environment variables.');
        setSummaryState('error');
        return null;
      }

      abortControllerRef.current = new AbortController();
      setSummaryState('loading');
      setSummaryError(null);

      try {
        const provider = createAiProvider(createProviderConfig(config));

        let body = email.bodyText || '';
        if (!body && email.bodyHtml) {
          body = convertHtmlToText(email.bodyHtml);
        }

        const result = await provider.generateSummary(
          email.id,
          email.subject,
          email.sender.email,
          body,
          abortControllerRef.current.signal
        );

        const emailSummary: EmailSummary = {
          summary: result.summary,
          generatedAt: result.generatedAt,
        };

        if (cache) {
          const emailWithSummary: Email = {
            ...email,
            summary: emailSummary,
          };
          cache.upsertEmails([emailWithSummary]);
        }

        setSummaryState('success');
        return emailSummary;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setSummaryState('idle');
          return null;
        }
        const errorMessage = error instanceof Error ? error.message : 'Summary generation failed';
        setSummaryError(errorMessage);
        setSummaryState('error');
        return null;
      }
    },
    [cache]
  );

  const abortGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setSummaryState('idle');
    }
  }, []);

  return {
    summaryState,
    summaryError,
    generateSummary,
    abortGeneration,
  };
}
