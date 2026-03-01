/**
 * Email Actions Contracts
 * TypeScript interfaces for email action keys feature
 */

import type { Email } from '../../../src/core/models/index.js';

export type ActionType = 'archive' | 'delete';

export interface ActionResult {
  type: 'success' | 'failure' | 'confirmation-required';
  emailId: string;
  action: ActionType;
  error?: string;
}

export interface EmailActionState {
  isProcessing: boolean;
  lastAction: ActionResult | null;
  showDeleteConfirmation: boolean;
  confirmationTargetEmailId: string | null;
}

export interface UseEmailActionsOptions {
  client?: {
    archive(
      messageIds: string[]
    ): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }>;
    trash(
      messageIds: string[]
    ): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }>;
  };
  emails: Email[];
  onEmailRemoved: (emailId: string) => void;
}

export interface UseEmailActionsResult {
  state: EmailActionState;
  archiveEmail: (emailId: string) => Promise<void>;
  deleteEmail: (emailId: string) => Promise<void>;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
}

export interface KeyboardActionHandlers {
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
}
