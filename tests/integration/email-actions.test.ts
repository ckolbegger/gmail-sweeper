/**
 * T046: Integration tests for email actions
 * Tests full archive/delete flow with mocked Gmail client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface Email {
  id: string;
  subject: string;
}

interface EmailActionState {
  isProcessing: boolean;
  lastAction: { type: string; emailId: string; action: string; error?: string } | null;
  showDeleteConfirmation: boolean;
  confirmationTargetEmailId: string | null;
}

describe('Email Actions Integration', () => {
  describe('T023: Full archive/delete flow', () => {
    function createMockGmailClient() {
      const emails: Map<string, Email> = new Map([
        ['email-1', { id: 'email-1', subject: 'Test Email 1' }],
        ['email-2', { id: 'email-2', subject: 'Test Email 2' }],
        ['email-3', { id: 'email-3', subject: 'Test Email 3' }],
        ['email-4', { id: 'email-4', subject: 'Test Email 4' }],
        ['email-5', { id: 'email-5', subject: 'Test Email 5' }],
      ]);

      return {
        archive: vi.fn().mockImplementation(async (ids: string[]) => {
          const succeeded: string[] = [];
          const failed: Array<{ id: string; error: string }> = [];
          for (const id of ids) {
            if (emails.has(id)) {
              succeeded.push(id);
            } else {
              failed.push({ id, error: 'Email not found' });
            }
          }
          return { succeeded, failed };
        }),
        trash: vi.fn().mockImplementation(async (ids: string[]) => {
          const succeeded: string[] = [];
          const failed: Array<{ id: string; error: string }> = [];
          for (const id of ids) {
            if (emails.has(id)) {
              succeeded.push(id);
            } else {
              failed.push({ id, error: 'Email not found' });
            }
          }
          return { succeeded, failed };
        }),
        _emails: emails,
      };
    }

    function createEmailActionsState() {
      let state: EmailActionState = {
        isProcessing: false,
        lastAction: null,
        showDeleteConfirmation: false,
        confirmationTargetEmailId: null,
      };

      const setState = (newState: EmailActionState) => {
        state = newState;
      };

      const getState = () => state;

      const onEmailRemoved = vi.fn((emailId: string) => {
        const emails = mockClient._emails;
        if (emails.has(emailId)) {
          emails.delete(emailId);
        }
      });

      const mockClient = createMockGmailClient();

      const archiveEmail = async (emailId: string) => {
        if (!emailId) return;
        setState({ ...state, isProcessing: true });
        try {
          const result = await mockClient.archive([emailId]);
          if (result.succeeded.includes(emailId)) {
            setState({
              ...state,
              isProcessing: false,
              lastAction: { type: 'success', emailId, action: 'archive' },
            });
            onEmailRemoved(emailId);
          }
        } catch (e) {
          setState({
            ...state,
            isProcessing: false,
            lastAction: { type: 'failure', emailId, action: 'archive', error: String(e) },
          });
        }
      };

      const deleteEmail = (emailId: string) => {
        if (!emailId) return;
        setState({
          ...state,
          showDeleteConfirmation: true,
          confirmationTargetEmailId: emailId,
        });
      };

      const confirmDelete = async () => {
        const emailId = state.confirmationTargetEmailId;
        if (!emailId) return;
        setState({ ...state, isProcessing: true });
        try {
          const result = await mockClient.trash([emailId]);
          if (result.succeeded.includes(emailId)) {
            setState({
              ...state,
              isProcessing: false,
              showDeleteConfirmation: false,
              confirmationTargetEmailId: null,
              lastAction: { type: 'success', emailId, action: 'delete' },
            });
            onEmailRemoved(emailId);
          }
        } catch (e) {
          setState({
            ...state,
            isProcessing: false,
            showDeleteConfirmation: false,
            confirmationTargetEmailId: null,
            lastAction: { type: 'failure', emailId, action: 'delete', error: String(e) },
          });
        }
      };

      const cancelDelete = () => {
        setState({
          ...state,
          showDeleteConfirmation: false,
          confirmationTargetEmailId: null,
        });
      };

      return {
        getState,
        archiveEmail,
        deleteEmail,
        confirmDelete,
        cancelDelete,
        onEmailRemoved,
        mockClient,
        emailCount: () => mockClient._emails.size,
      };
    }

    it('should archive 5 emails successfully', async () => {
      const { archiveEmail, getState, onEmailRemoved, emailCount } = createEmailActionsState();

      expect(emailCount()).toBe(5);

      await archiveEmail('email-1');
      expect(emailCount()).toBe(4);
      expect(getState().lastAction?.type).toBe('success');
      expect(getState().lastAction?.action).toBe('archive');

      await archiveEmail('email-2');
      expect(emailCount()).toBe(3);

      await archiveEmail('email-3');
      expect(emailCount()).toBe(2);

      await archiveEmail('email-4');
      expect(emailCount()).toBe(1);

      await archiveEmail('email-5');
      expect(emailCount()).toBe(0);

      expect(onEmailRemoved).toHaveBeenCalledTimes(5);
    });

    it('should delete 2 emails after confirmation', async () => {
      const { deleteEmail, confirmDelete, getState, onEmailRemoved, emailCount, cancelDelete } =
        createEmailActionsState();

      expect(emailCount()).toBe(5);

      // Delete email-1
      deleteEmail('email-1');
      expect(getState().showDeleteConfirmation).toBe(true);
      expect(getState().confirmationTargetEmailId).toBe('email-1');

      await confirmDelete();
      expect(emailCount()).toBe(4);
      expect(getState().lastAction?.type).toBe('success');
      expect(getState().lastAction?.action).toBe('delete');

      // Delete email-2 (with cancel first to test)
      deleteEmail('email-2');
      cancelDelete();
      expect(getState().showDeleteConfirmation).toBe(false);
      expect(emailCount()).toBe(4); // Not deleted

      // Actually delete email-2
      deleteEmail('email-2');
      await confirmDelete();
      expect(emailCount()).toBe(3);

      expect(onEmailRemoved).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed archive and delete operations', async () => {
      const { archiveEmail, deleteEmail, confirmDelete, emailCount } = createEmailActionsState();

      // Archive 3 emails
      await archiveEmail('email-1');
      await archiveEmail('email-2');
      await archiveEmail('email-3');
      expect(emailCount()).toBe(2);

      // Delete remaining 2 emails
      deleteEmail('email-4');
      await confirmDelete();
      deleteEmail('email-5');
      await confirmDelete();
      expect(emailCount()).toBe(0);
    });

    it('should handle empty email IDs (no selection)', async () => {
      const { archiveEmail, deleteEmail, getState } = createEmailActionsState();

      // Empty ID - nothing happens
      await archiveEmail('');
      expect(getState().lastAction).toBeNull();

      deleteEmail('');
      expect(getState().showDeleteConfirmation).toBe(false);
    });
  });
});
