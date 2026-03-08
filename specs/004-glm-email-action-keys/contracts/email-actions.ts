/**
 * Email Action Contracts
 *
 * Type definitions for email archive and delete actions.
 * Feature: 004-glm-email-action-keys
 */

import type { BatchActionResult } from '../../core/contracts/gmail-api.js';
import type { Email } from '../../core/models/email.js';

/**
 * Result of an email action (archive or delete)
 */
export interface EmailActionResult {
  /** Whether the action completed successfully */
  success: boolean;

  /** ID of the affected email */
  emailId: string;

  /** Type of action performed */
  action: 'archive' | 'delete';

  /** Error message if action failed */
  error?: string;
}

/**
 * Handler function type for email actions
 */
export type EmailActionHandler = (emailId: string) => Promise<EmailActionResult>;

/**
 * Selection update after action
 */
export interface SelectionUpdate {
  /** New selected email ID (undefined if list is empty) */
  selectedId: string | undefined;

  /** Whether the selection changed */
  changed: boolean;
}

/**
 * Calculate the next selection after removing an email
 * @param emailsBeforeRemoval - The email list BEFORE the removal
 * @param removedId - The ID of the email being removed
 * @param currentSelectedId - The currently selected email ID
 * @returns The new selection state
 */
export function calculateNextSelection(
  emailsBeforeRemoval: Email[],
  removedId: string,
  currentSelectedId: string | undefined
): SelectionUpdate {
  if (emailsBeforeRemoval.length === 0) {
    return { selectedId: undefined, changed: currentSelectedId !== undefined };
  }

  const removedIndex = emailsBeforeRemoval.findIndex((e) => e.id === removedId);

  // If current selection is not the removed email, keep it
  if (currentSelectedId !== removedId) {
    return { selectedId: currentSelectedId, changed: false };
  }

  // Calculate list after removal
  const remainingCount = emailsBeforeRemoval.length - 1;

  // If list will be empty after removal
  if (remainingCount === 0) {
    return { selectedId: undefined, changed: true };
  }

  // If removed email was last, select previous
  if (removedIndex === emailsBeforeRemoval.length - 1) {
    const newSelectedId = emailsBeforeRemoval[removedIndex - 1]?.id;
    return { selectedId: newSelectedId, changed: true };
  }

  // Otherwise, select the email that was after the removed one (now at same index)
  const newSelectedId = emailsBeforeRemoval[removedIndex + 1]?.id;
  return { selectedId: newSelectedId, changed: true };
}

/**
 * Convert BatchActionResult to EmailActionResult
 */
export function toEmailActionResult(
  result: BatchActionResult,
  emailId: string,
  action: 'archive' | 'delete'
): EmailActionResult {
  if (result.success) {
    return { success: true, emailId, action };
  }

  const failure = result.failures.find((f) => f.emailId === emailId);
  return {
    success: false,
    emailId,
    action,
    error: failure?.error ?? 'Unknown error',
  };
}
