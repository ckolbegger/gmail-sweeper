/**
 * T043: useGmail hook - handles email fetching, caching, pagination, and error states.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Email } from '../../core/models/index.js';
import type { GmailClient } from '../../core/gmail/client.js';
import type { EmailCache } from '../../core/cache/db.js';

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
  pageToken?: string;
}

interface UseGmailResult extends UseGmailState {
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useGmail({
  client,
  cache,
  initialLoadSize = 50,
}: UseGmailOptions): UseGmailResult {
  const [state, setState] = useState<UseGmailState>({
    emails: [],
    isLoading: true,
    error: null,
    hasMore: true,
  });

  const pendingRefreshRef = useRef<Promise<void> | null>(null);
  const cacheRef = useRef<Email[]>([]);

  // Initial load
  useEffect(() => {
    const loadEmails = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Try to load from cache first
        const cachedEmails = cache.getEmails({ limit: initialLoadSize });
        cacheRef.current = cachedEmails;

        // If cache is empty and we have a client, fetch from Gmail
        if (cachedEmails.length === 0 && client) {
          const gmailEmails = await client.listMessages({ maxResults: initialLoadSize });
          cache.upsertEmails(gmailEmails.messages);
          cacheRef.current = gmailEmails.messages;

          setState(prev => ({
            ...prev,
            emails: gmailEmails.messages,
            hasMore: !!gmailEmails.nextPageToken,
            pageToken: gmailEmails.nextPageToken,
            isLoading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            emails: cachedEmails,
            isLoading: false,
            hasMore: cachedEmails.length >= initialLoadSize,
          }));
        }
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err : new Error('Failed to load emails'),
          isLoading: false,
        }));
      }
    };

    loadEmails();
  }, [cache, client, initialLoadSize]);

  const refresh = useCallback(async () => {
    // Deduplicate concurrent refresh calls
    if (pendingRefreshRef.current) {
      return pendingRefreshRef.current;
    }

    const refreshPromise = (async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        if (client) {
          const result = await client.listMessages({ maxResults: initialLoadSize });
          cache.upsertEmails(result.messages);
          cacheRef.current = result.messages;

          setState(prev => ({
            ...prev,
            emails: result.messages,
            hasMore: !!result.nextPageToken,
            pageToken: result.nextPageToken,
            isLoading: false,
          }));
        } else {
          const cachedEmails = cache.getEmails({ limit: initialLoadSize });
          setState(prev => ({
            ...prev,
            emails: cachedEmails,
            isLoading: false,
          }));
        }
      } catch (err) {
        setState(prev => ({
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
      setState(prev => ({ ...prev, isLoading: true }));

      const result = await client.listMessages({
        maxResults: initialLoadSize,
        pageToken: state.pageToken,
      });

      cache.upsertEmails(result.messages);
      const allEmails = [...cacheRef.current, ...result.messages];
      cacheRef.current = allEmails;

      setState(prev => ({
        ...prev,
        emails: allEmails,
        hasMore: !!result.nextPageToken,
        pageToken: result.nextPageToken,
        isLoading: false,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to load more emails'),
        isLoading: false,
      }));
    }
  }, [state.hasMore, state.pageToken, cache, client, initialLoadSize]);

  return {
    ...state,
    refresh,
    loadMore,
  };
}
