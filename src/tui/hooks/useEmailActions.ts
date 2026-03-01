/**
 * T003/T006/T011: useEmailActions hook — optimistic archive/delete with revert on failure.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Email } from '../../core/models/index.js';
import type { GmailClient } from '../../core/gmail/client.js';

export interface UseEmailActionsOptions {
  client: GmailClient | undefined;
  emails: Email[];
  onRemove: (id: string) => void;
  onRestore: (email: Email, index: number) => void;
  onPersistRemove?: (id: string) => void;
}

export interface UseEmailActionsResult {
  archive: (emailId: string) => void;
  delete: (emailId: string) => void;
  actionError: string | null;
  clearActionError: () => void;
}

export function useEmailActions({
  client,
  emails,
  onRemove,
  onRestore,
  onPersistRemove,
}: UseEmailActionsOptions): UseEmailActionsResult {
  const [actionError, setActionError] = useState<string | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());

  // T011: auto-clear actionError after 4s
  useEffect(() => {
    if (actionError === null) return;
    const timer = setTimeout(() => setActionError(null), 4000);
    return () => clearTimeout(timer);
  }, [actionError]);

  const clearActionError = useCallback(() => setActionError(null), []);

  const archive = useCallback(
    (emailId: string) => {
      if (!client) return;
      if (inFlightRef.current.has(emailId)) return;
      inFlightRef.current.add(emailId);

      const index = emails.findIndex(e => e.id === emailId);
      const email = emails[index];
      onRemove(emailId);

      client.archive([emailId])
        .then(result => {
          if (result.failed.length > 0) {
            if (email) onRestore(email, index);
            setActionError(`Failed to archive: ${result.failed[0]!.error}`);
          } else {
            onPersistRemove?.(emailId);
          }
        })
        .catch((err: Error) => {
          if (email) onRestore(email, index);
          setActionError(`Failed to archive: ${err.message}`);
        })
        .finally(() => {
          inFlightRef.current.delete(emailId);
        });
    },
    [client, emails, onRemove, onRestore],
  );

  const deleteEmail = useCallback(
    (emailId: string) => {
      if (!client) return;
      if (inFlightRef.current.has(emailId)) return;
      inFlightRef.current.add(emailId);

      const index = emails.findIndex(e => e.id === emailId);
      const email = emails[index];
      onRemove(emailId);

      client.trash([emailId])
        .then(result => {
          if (result.failed.length > 0) {
            if (email) onRestore(email, index);
            setActionError(`Failed to delete: ${result.failed[0]!.error}`);
          } else {
            onPersistRemove?.(emailId);
          }
        })
        .catch((err: Error) => {
          if (email) onRestore(email, index);
          setActionError(`Failed to delete: ${err.message}`);
        })
        .finally(() => {
          inFlightRef.current.delete(emailId);
        });
    },
    [client, emails, onRemove, onRestore],
  );

  return {
    archive,
    delete: deleteEmail,
    actionError,
    clearActionError,
  };
}
