import type { gmail_v1 } from 'googleapis';
import {
  LabelSchema,
  LabelColorSchema,
  type Label,
  type LabelColor,
} from './validation.js';

// Re-export validation schemas and types
export {
  LabelSchema,
  LabelColorSchema,
  type Label,
  type LabelColor,
};

/**
 * Parse a Gmail API label to our Label model
 */
export function parseGmailLabel(gmailLabel: gmail_v1.Schema$Label): Label {
  const color: LabelColor | undefined =
    gmailLabel.color?.backgroundColor && gmailLabel.color.textColor
      ? {
          backgroundColor: gmailLabel.color.backgroundColor,
          textColor: gmailLabel.color.textColor,
        }
      : undefined;

  return {
    id: gmailLabel.id!,
    name: gmailLabel.name!,
    type: gmailLabel.type === 'system' ? 'system' : 'user',
    color,
    updatedAt: new Date(),
  };
}

/**
 * Check if a label is a system label
 */
export function isSystemLabel(labelId: string): boolean {
  const systemLabels = [
    'INBOX',
    'SPAM',
    'TRASH',
    'UNREAD',
    'STARRED',
    'IMPORTANT',
    'SENT',
    'DRAFT',
    'CHAT',
    'CATEGORY_PERSONAL',
    'CATEGORY_SOCIAL',
    'CATEGORY_PROMOTIONS',
    'CATEGORY_UPDATES',
    'CATEGORY_FORUMS',
  ];
  return systemLabels.includes(labelId);
}

/**
 * Get user-friendly label name from label ID
 */
export function getLabelDisplayName(labelId: string, labelName?: string): string {
  if (!isSystemLabel(labelId)) {
    return labelName || labelId;
  }

  const displayNames: Record<string, string> = {
    INBOX: 'Inbox',
    SPAM: 'Spam',
    TRASH: 'Trash',
    UNREAD: 'Unread',
    STARRED: 'Starred',
    IMPORTANT: 'Important',
    SENT: 'Sent',
    DRAFT: 'Drafts',
    CATEGORY_SOCIAL: 'Social',
    CATEGORY_PROMOTIONS: 'Promotions',
    CATEGORY_UPDATES: 'Updates',
    CATEGORY_FORUMS: 'Forums',
  };

  return displayNames[labelId] || labelName || labelId;
}
