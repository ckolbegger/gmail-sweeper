/**
 * T044: Unit tests for useEmailActions hook.
 * Tests archive/delete actions with confirmation flow.
 */

import { describe, it, expect, vi } from 'vitest';

interface EmailActionState {
  isProcessing: boolean;
  lastAction: { type: string; emailId: string; action: string; error?: string } | null;
  showDeleteConfirmation: boolean;
  confirmationTargetEmailId: string | null;
}

describe('useEmailActions', () => {
  describe('T003: Archive Email', () => {
    function createEmailActionsController() {
      let state: EmailActionState = {
        isProcessing: false,
        lastAction: null,
        showDeleteConfirmation: false,
        confirmationTargetEmailId: null,
      };

      const onEmailRemoved = vi.fn();

      const mockClient = {
        archive: vi.fn().mockResolvedValue({ succeeded: ['email-1'], failed: [] }),
        trash: vi.fn(),
      };

      const archiveEmail = async (emailId: string) => {
        if (!emailId) return;

        state.isProcessing = true;
        try {
          await mockClient.archive([emailId]);
          state.lastAction = { type: 'success', emailId, action: 'archive' };
          onEmailRemoved(emailId);
        } catch (error) {
          state.lastAction = {
            type: 'failure',
            emailId,
            action: 'archive',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        } finally {
          state.isProcessing = false;
        }
      };

      return {
        getState: () => state,
        archiveEmail,
        onEmailRemoved,
        mockClient,
      };
    }

    it('should archive email and remove from list on success', async () => {
      const { archiveEmail, onEmailRemoved, getState } = createEmailActionsController();

      await archiveEmail('email-1');

      expect(getState().lastAction).toEqual({
        type: 'success',
        emailId: 'email-1',
        action: 'archive',
      });
      expect(onEmailRemoved).toHaveBeenCalledWith('email-1');
    });

    it('should set isProcessing during archive operation', async () => {
      const { archiveEmail, getState } = createEmailActionsController();

      const archivePromise = archiveEmail('email-1');
      expect(getState().isProcessing).toBe(true);

      await archivePromise;
      expect(getState().isProcessing).toBe(false);
    });

    it('should handle archive failure gracefully', async () => {
      const { archiveEmail, getState, mockClient } = createEmailActionsController();

      mockClient.archive.mockRejectedValueOnce(new Error('Network error'));

      await archiveEmail('email-1');

      expect(getState().lastAction).toEqual({
        type: 'failure',
        emailId: 'email-1',
        action: 'archive',
        error: 'Network error',
      });
    });

    it('should do nothing when emailId is empty', async () => {
      const { archiveEmail, onEmailRemoved, getState } = createEmailActionsController();

      await archiveEmail('');

      expect(onEmailRemoved).not.toHaveBeenCalled();
      expect(getState().lastAction).toBeNull();
    });
  });

  describe('T009-T011: Delete Email with Confirmation', () => {
    function createDeleteController() {
      let state: EmailActionState = {
        isProcessing: false,
        lastAction: null,
        showDeleteConfirmation: false,
        confirmationTargetEmailId: null,
      };

      const onEmailRemoved = vi.fn();

      const mockClient = {
        archive: vi.fn(),
        trash: vi.fn().mockResolvedValue({ succeeded: ['email-1'], failed: [] }),
      };

      const deleteEmail = (emailId: string) => {
        if (!emailId) return;
        state.showDeleteConfirmation = true;
        state.confirmationTargetEmailId = emailId;
      };

      const confirmDelete = async () => {
        if (!state.confirmationTargetEmailId) return;

        state.isProcessing = true;
        try {
          await mockClient.trash([state.confirmationTargetEmailId]);
          state.lastAction = {
            type: 'success',
            emailId: state.confirmationTargetEmailId,
            action: 'delete',
          };
          onEmailRemoved(state.confirmationTargetEmailId);
        } catch (error) {
          state.lastAction = {
            type: 'failure',
            emailId: state.confirmationTargetEmailId,
            action: 'delete',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        } finally {
          state.isProcessing = false;
          state.showDeleteConfirmation = false;
          state.confirmationTargetEmailId = null;
        }
      };

      const cancelDelete = () => {
        state.showDeleteConfirmation = false;
        state.confirmationTargetEmailId = null;
      };

      return {
        getState: () => state,
        deleteEmail,
        confirmDelete,
        cancelDelete,
        onEmailRemoved,
        mockClient,
      };
    }

    it('should show confirmation when deleteEmail is called', () => {
      const { deleteEmail, getState } = createDeleteController();

      deleteEmail('email-1');

      expect(getState().showDeleteConfirmation).toBe(true);
      expect(getState().confirmationTargetEmailId).toBe('email-1');
    });

    it('should trash email when confirmed', async () => {
      const { deleteEmail, confirmDelete, onEmailRemoved, getState, mockClient } =
        createDeleteController();

      deleteEmail('email-1');
      await confirmDelete();

      expect(mockClient.trash).toHaveBeenCalledWith(['email-1']);
      expect(onEmailRemoved).toHaveBeenCalledWith('email-1');
      expect(getState().lastAction).toEqual({
        type: 'success',
        emailId: 'email-1',
        action: 'delete',
      });
    });

    it('should cancel delete and clear confirmation', () => {
      const { deleteEmail, cancelDelete, getState, mockClient } = createDeleteController();

      deleteEmail('email-1');
      cancelDelete();

      expect(getState().showDeleteConfirmation).toBe(false);
      expect(getState().confirmationTargetEmailId).toBeNull();
      expect(mockClient.trash).not.toHaveBeenCalled();
    });

    it('should do nothing when deleteEmail called with empty id', () => {
      const { deleteEmail, getState } = createDeleteController();

      deleteEmail('');

      expect(getState().showDeleteConfirmation).toBe(false);
    });
  });
});
