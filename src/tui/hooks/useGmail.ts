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
  onEmailsFetched?: () => void;
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
  removeEmail: (id: string) => void;
  restoreEmail: (email: Email, index: number) => void;
}

/** Pure helper: removes an email by id from a list. */
export function removeEmailFromList(emails: Email[], id: string): Email[] {
  return emails.filter(e => e.id !== id);
}

/** Pure helper: inserts an email at a clamped index. */
export function restoreEmailToList(emails: Email[], email: Email, index: number): Email[] {
  const next = [...emails];
  const clamped = Math.max(0, Math.min(index, next.length));
  next.splice(clamped, 0, email);
  return next;
}

export function useGmail({
  client,
  cache,
  initialLoadSize = 50,
  onEmailsFetched,
}: UseGmailOptions): UseGmailResult {
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
        ...(state.pageToken ? { pageToken: state.pageToken } : {}),
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
      onEmailsFetched?.();
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to load more emails'),
        isLoading: false,
      }));
    }
  }, [state.hasMore, state.pageToken, cache, client, initialLoadSize, onEmailsFetched]);

  const fetchEmailDetail = useCallback(async (emailId: string): Promise<Email | null> => {
    if (!client) return null;

    // Check if we already have the body
    const existing = state.emails.find(e => e.id === emailId);
    if (existing?.bodyText || existing?.bodyHtml) {
      return existing;
    }

    try {
      const fullEmail = await client.getMessage(emailId, 'full');

      // Update the email in state with full body
      setState(prev => ({
        ...prev,
        emails: prev.emails.map(e => e.id === emailId ? { ...e, ...fullEmail } : e),
      }));

      return fullEmail;
    } catch {
      return null;
    }
  }, [client, state.emails]);

  const removeEmail = useCallback((id: string) => {
    setState(prev => ({ ...prev, emails: removeEmailFromList(prev.emails, id) }));
  }, []);

  const restoreEmail = useCallback((email: Email, index: number) => {
    setState(prev => ({ ...prev, emails: restoreEmailToList(prev.emails, email, index) }));
  }, []);

  return {
    ...state,
    refresh,
    loadMore,
    fetchEmailDetail,
    removeEmail,
    restoreEmail,
  };
}
