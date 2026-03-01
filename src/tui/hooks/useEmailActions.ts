/**
 * T044: useEmailActions hook - handles email archive and delete actions with confirmation.
 */

import { appendFileSync } from 'fs';
import { homedir } from 'os';
import { useState, useCallback } from 'react';
import type { EmailActionState } from '../../core/models/index.js';
import type { GmailClient } from '../../core/gmail/client.js';

function debugLog(message: string) {
  const timestamp = new Date().toISOString();
  const logPath = `${homedir()}/gmail-sweep-debug.log`;
  appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

interface UseEmailActionsOptions {
  client?: GmailClient;
  onEmailRemoved: (emailId: string) => void;
  onSuccess?: () => void;
}

interface UseEmailActionsResult {
  state: EmailActionState;
  archiveEmail: (emailId: string) => Promise<void>;
  deleteEmail: (emailId: string) => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  clearLastAction: () => void;
}

const initialState: EmailActionState = {
  isProcessing: false,
  lastAction: null,
  showDeleteConfirmation: false,
  confirmationTargetEmailId: null,
};

export function useEmailActions({
  client,
  onEmailRemoved,
  onSuccess,
}: UseEmailActionsOptions): UseEmailActionsResult {
  const [state, setState] = useState<EmailActionState>(initialState);

  const archiveEmail = useCallback(
    async (emailId: string) => {
      if (!emailId) return;

      debugLog(`ARCHIVE: Starting for emailId=${emailId}`);
      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        if (client) {
          debugLog(`ARCHIVE: Calling client.archive for emailId=${emailId}`);
          const result = await client.archive([emailId]);
          debugLog(
            `ARCHIVE: Result for emailId=${emailId}: succeeded=${result.succeeded.join(',')}, failed=${JSON.stringify(result.failed)}`
          );
          if (result.succeeded.includes(emailId)) {
            debugLog(`ARCHIVE: Success for emailId=${emailId}`);
            setState((prev) => ({
              ...prev,
              isProcessing: false,
              lastAction: { type: 'success', emailId, action: 'archive' },
            }));
            onEmailRemoved(emailId);
            onSuccess?.();
          } else {
            const failed = result.failed.find((f) => f.id === emailId);
            debugLog(`ARCHIVE: Failed for emailId=${emailId}: ${failed?.error}`);
            setState((prev) => ({
              ...prev,
              isProcessing: false,
              lastAction: {
                type: 'failure',
                emailId,
                action: 'archive',
                error: failed?.error ?? 'Unknown error',
              },
            }));
          }
        } else {
          debugLog('ARCHIVE: No client available');
        }
      } catch (error) {
        debugLog(`ARCHIVE: Exception for emailId=${emailId}: ${error}`);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          lastAction: {
            type: 'failure',
            emailId,
            action: 'archive',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }));
      }
    },
    [client, onEmailRemoved, onSuccess]
  );

  const deleteEmail = useCallback((emailId: string) => {
    if (!emailId) return;

    debugLog(`DELETE: Setting confirmation for emailId=${emailId}`);
    setState((prev) => ({
      ...prev,
      showDeleteConfirmation: true,
      confirmationTargetEmailId: emailId,
    }));
  }, []);

  const confirmDelete = useCallback(async () => {
    const emailId = state.confirmationTargetEmailId;
    if (!emailId) return;

    debugLog(`DELETE: Confirming for emailId=${emailId}`);
    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      if (client) {
        debugLog(`DELETE: Calling client.trash for emailId=${emailId}`);
        const result = await client.trash([emailId]);
        debugLog(
          `DELETE: Result for emailId=${emailId}: succeeded=${result.succeeded.join(',')}, failed=${JSON.stringify(result.failed)}`
        );
        if (result.succeeded.includes(emailId)) {
          debugLog(`DELETE: Success for emailId=${emailId}`);
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            showDeleteConfirmation: false,
            confirmationTargetEmailId: null,
            lastAction: { type: 'success', emailId, action: 'delete' },
          }));
          onEmailRemoved(emailId);
          onSuccess?.();
        } else {
          const failed = result.failed.find((f) => f.id === emailId);
          debugLog(`DELETE: Failed for emailId=${emailId}: ${failed?.error}`);
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            showDeleteConfirmation: false,
            confirmationTargetEmailId: null,
            lastAction: {
              type: 'failure',
              emailId,
              action: 'delete',
              error: failed?.error ?? 'Unknown error',
            },
          }));
        }
      } else {
        debugLog('DELETE: No client available');
      }
    } catch (error) {
      debugLog(`DELETE: Exception for emailId=${emailId}: ${error}`);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showDeleteConfirmation: false,
        confirmationTargetEmailId: null,
        lastAction: {
          type: 'failure',
          emailId,
          action: 'delete',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  }, [client, state.confirmationTargetEmailId, onEmailRemoved, onSuccess]);

  const cancelDelete = useCallback(() => {
    debugLog('DELETE: Cancelled');
    setState((prev) => ({
      ...prev,
      showDeleteConfirmation: false,
      confirmationTargetEmailId: null,
    }));
  }, []);

  const clearLastAction = useCallback(() => {
    setState((prev) => ({ ...prev, lastAction: null }));
  }, []);

  return {
    state,
    archiveEmail,
    deleteEmail,
    confirmDelete,
    cancelDelete,
    clearLastAction,
  };
}
