/**
 * T043: useGmail hook - handles email fetching, caching, pagination, and error states.
 */

import { appendFileSync } from 'fs';
import { homedir } from 'os';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Email } from '../../core/models/index.js';
import type { GmailClient } from '../../core/gmail/client.js';
import type { EmailCache } from '../../core/cache/db.js';

function debugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logPath = `${homedir()}/gmail-sweep-debug.log`;
  appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

interface UseGmailOptions {
  client?: GmailClient;
  cache: EmailCache;
  initialLoadSize?: number;
}

interface UseGmailState {
  emails: Email[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  pageToken: string | undefined;
}

interface UseGmailResult extends UseGmailState {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  fetchEmailDetail: (emailId: string) => Promise<Email | null>;
}

export function useGmail({ client, cache, initialLoadSize = 50 }: UseGmailOptions): UseGmailResult {
  const [state, setState] = useState<UseGmailState>({
    emails: [],
    isLoading: true,
    error: null,
    hasMore: true,
    pageToken: undefined,
  });

  const pendingRefreshRef = useRef<Promise<void> | null>(null);
  const cacheRef = useRef<Email[]>([]);

  // Initial load
  useEffect(() => {
    const loadEmails = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Always fetch fresh from Gmail when client is available
        // This ensures we don't use stale cached data
        if (client) {
          debugLog('INITIAL: Fetching from Gmail (always fresh)');
          const gmailEmails = await client.listMessages({ maxResults: initialLoadSize });
          cache.upsertEmails(gmailEmails.messages);
          cacheRef.current = gmailEmails.messages;

          setState((prev) => ({
            ...prev,
            emails: gmailEmails.messages,
            hasMore: !!gmailEmails.nextPageToken,
            pageToken: gmailEmails.nextPageToken,
            isLoading: false,
          }));
        } else {
          // No client - use cache as fallback
          const cachedEmails = cache.getEmails({ limit: initialLoadSize });
          cacheRef.current = cachedEmails;

          setState((prev) => ({
            ...prev,
            emails: cachedEmails,
            isLoading: false,
            hasMore: cachedEmails.length >= initialLoadSize,
          }));
        }
      } catch (err) {
        debugLog(`INITIAL: Error: ${err}`);
        // On error, try to fall back to cache
        const cachedEmails = cache.getEmails({ limit: initialLoadSize });
        setState((prev) => ({
          ...prev,
          emails: cachedEmails,
          error: err instanceof Error ? err : new Error('Failed to load emails'),
          isLoading: false,
          hasMore: cachedEmails.length >= initialLoadSize,
        }));
      }
    };

    loadEmails();
  }, [cache, client, initialLoadSize]);

  const refresh = useCallback(async () => {
    debugLog('REFRESH: Starting refresh');
    // Deduplicate concurrent refresh calls
    if (pendingRefreshRef.current) {
      debugLog('REFRESH: Already pending, returning existing promise');
      return pendingRefreshRef.current;
    }

    const refreshPromise = (async () => {
      try {
        debugLog('REFRESH: Setting isLoading=true');
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        if (client) {
          debugLog('REFRESH: Fetching from Gmail API');
          const result = await client.listMessages({ maxResults: initialLoadSize });
          debugLog(`REFRESH: Got ${result.messages.length} emails from Gmail`);
          cache.upsertEmails(result.messages);
          cacheRef.current = result.messages;

          setState((prev) => ({
            ...prev,
            emails: result.messages,
            hasMore: !!result.nextPageToken,
            pageToken: result.nextPageToken,
            isLoading: false,
          }));
          debugLog('REFRESH: Updated state with Gmail emails');
        } else {
          debugLog('REFRESH: No client, using cache');
          const cachedEmails = cache.getEmails({ limit: initialLoadSize });
          setState((prev) => ({
            ...prev,
            emails: cachedEmails,
            isLoading: false,
          }));
        }
      } catch (err) {
        debugLog(`REFRESH: Error: ${err}`);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error('Failed to refresh emails'),
          isLoading: false,
        }));
      } finally {
        pendingRefreshRef.current = null;
      }
    })();

    pendingRefreshRef.current = refreshPromise;
    return refreshPromise;
  }, [cache, client, initialLoadSize]);

  const loadMore = useCallback(async () => {
    if (!state.hasMore || !client) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const result = await client.listMessages({
        maxResults: initialLoadSize,
        ...(state.pageToken ? { pageToken: state.pageToken } : {}),
      });

      cache.upsertEmails(result.messages);
      const allEmails = [...cacheRef.current, ...result.messages];
      cacheRef.current = allEmails;

      setState((prev) => ({
        ...prev,
        emails: allEmails,
        hasMore: !!result.nextPageToken,
        pageToken: result.nextPageToken,
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to load more emails'),
        isLoading: false,
      }));
    }
  }, [state.hasMore, state.pageToken, cache, client, initialLoadSize]);

  const fetchEmailDetail = useCallback(
    async (emailId: string): Promise<Email | null> => {
      if (!client) return null;

      // Check if we already have the body
      const existing = state.emails.find((e) => e.id === emailId);
      if (existing?.bodyText || existing?.bodyHtml) {
        return existing;
      }

      try {
        const fullEmail = await client.getMessage(emailId, 'full');

        // Update the email in state with full body
        setState((prev) => ({
          ...prev,
          emails: prev.emails.map((e) => (e.id === emailId ? { ...e, ...fullEmail } : e)),
        }));

        return fullEmail;
      } catch {
        return null;
      }
    },
    [client, state.emails]
  );

  return {
    ...state,
    refresh,
    loadMore,
    fetchEmailDetail,
  };
}
