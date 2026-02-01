import type { gmail_v1 } from 'googleapis';
import {
  EmailSchema,
  EmailAddressSchema,
  EmailBodySchema,
  type Email,
  type EmailAddress,
  type EmailBody,
} from './validation.js';

// Re-export validation schemas and types
export {
  EmailSchema,
  EmailAddressSchema,
  EmailBodySchema,
  type Email,
  type EmailAddress,
  type EmailBody,
};

/**
 * Parse a Gmail API message to our Email model
 */
export function parseGmailMessage(message: gmail_v1.Schema$Message): Email {
  const payload = message.payload ?? {};
  const headers = payload.headers ?? [];

  const getHeader = (name: string): string => {
    return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
  };

  const parseEmail = (header: string): EmailAddress => {
    const value = getHeader(header);
    const match = value.match(/(?:"?([^"]*)"?\s)?(?:<)?([^>]+@[^>]+)(?:>)?/);
    if (match) {
      return { name: match[1]?.trim(), email: match[2].trim() };
    }
    return { email: value };
  };

  const parseRecipients = (header: string): EmailAddress[] => {
    const value = getHeader(header);
    if (!value) return [];
    return value
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => {
        const match = r.match(/(?:"?([^"]*)"?\s)?(?:<)?([^>]+@[^>]+)(?:>)?/);
        if (match) {
          return { name: match[1]?.trim(), email: match[2].trim() };
        }
        return { email: r };
      });
  };

  const getBodyText = (): string => {
    const getTextFromPart = (part: any): string => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        return part.parts.map((p: any) => getTextFromPart(p)).join('');
      }
      return '';
    };
    return getTextFromPart(payload);
  };

  const getBodyHtml = (): string | undefined => {
    const getHtmlFromPart = (part: any): string | undefined => {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        for (const p of part.parts) {
          const html = getHtmlFromPart(p);
          if (html) return html;
        }
      }
      return undefined;
    };
    return getHtmlFromPart(payload);
  };

  const labels = message.labelIds ?? [];
  const isRead = !labels.includes('UNREAD');

  // Extract category from labels
  const categoryMap: Record<string, Email['category']> = {
    CATEGORY_SOCIAL: 'social',
    CATEGORY_PROMOTIONS: 'promotions',
    CATEGORY_UPDATES: 'updates',
    CATEGORY_FORUMS: 'forums',
  };
  const category = labels
    .map((l) => categoryMap[l])
    .find((c): c is NonNullable<typeof c> => c !== undefined);

  return {
    id: message.id!,
    threadId: message.threadId!,
    subject: getHeader('Subject') || '(No Subject)',
    sender: parseEmail('From'),
    recipients: parseRecipients('To'),
    cc: parseRecipients('Cc'),
    bcc: parseRecipients('Bcc'),
    dateReceived: new Date(Number(message.internalDate)),
    body: {
      text: getBodyText(),
      html: getBodyHtml(),
    },
    labels,
    isRead,
    category,
    snippet: message.snippet ?? '',
    historyId: message.historyId ?? '',
    syncedAt: new Date(),
  };
}
