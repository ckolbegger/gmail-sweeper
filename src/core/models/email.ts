/**
 * Email Model Types and Validation
 *
 * Defines the Email entity with Zod runtime validation.
 */

import { z } from 'zod';
import type { Email, EmailAddress } from '../contracts/types.js';

// ============================================================================
// Schemas
// ============================================================================

export const EmailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
});

export const EmailBodySchema = z.object({
  text: z.string(),
  html: z.string().optional(),
});

export const GmailCategorySchema = z.enum([
  'primary',
  'social',
  'promotions',
  'updates',
  'forums',
]);

export const EmailSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  subject: z.string(),
  sender: EmailAddressSchema,
  recipients: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema).default([]),
  bcc: z.array(EmailAddressSchema).default([]),
  dateReceived: z.date(),
  body: EmailBodySchema,
  labels: z.array(z.string()),
  isRead: z.boolean(),
  category: GmailCategorySchema.optional(),
  snippet: z.string(),
  historyId: z.string().min(1),
  syncedAt: z.date(),
});

// ============================================================================
// Types
// ============================================================================

// Types are exported from contracts/types.ts to avoid duplication
// Use: import type { Email, EmailAddress, EmailBody, GmailCategory } from '@core/contracts/types.js'

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate an email address object
 */
export function validateEmailAddress(data: unknown): EmailAddress {
  return EmailAddressSchema.parse(data);
}

/**
 * Validate a complete email object
 */
export function validateEmail(data: unknown): Email {
  return EmailSchema.parse(data);
}

/**
 * Validate partial email data (for updates)
 */
export function validateEmailPartial(data: unknown): Partial<Email> {
  return EmailSchema.partial().parse(data);
}

/**
 * Safely validate an email object
 */
export function safeValidateEmail(data: unknown): {
  success: boolean;
  data?: Email;
  error?: z.ZodError;
} {
  const result = EmailSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse email from Gmail API response
 */
export function parseGmailMessage(_message: unknown): Email {
  // TODO: Implement Gmail API message parsing
  // This is a placeholder - full implementation in GmailClient service
  throw new Error('Not implemented');
}
