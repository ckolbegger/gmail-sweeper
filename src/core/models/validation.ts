import { z } from 'zod';

// Email Address Schema
export const EmailAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
});

// Email Body Schema
export const EmailBodySchema = z.object({
  text: z.string(),
  html: z.string().optional(),
});

// Email Schema
export const EmailSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  subject: z.string(),
  sender: EmailAddressSchema,
  recipients: z.array(EmailAddressSchema),
  cc: z.array(EmailAddressSchema).default([]),
  bcc: z.array(EmailAddressSchema).default([]),
  dateReceived: z.date(),
  body: EmailBodySchema,
  labels: z.array(z.string()),
  isRead: z.boolean(),
  category: z.enum(['primary', 'social', 'promotions', 'updates', 'forums']).optional(),
  snippet: z.string(),
  historyId: z.string(),
  syncedAt: z.date(),
});

// Label Color Schema
export const LabelColorSchema = z.object({
  backgroundColor: z.string(),
  textColor: z.string(),
});

// Label Schema
export const LabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['system', 'user']),
  color: LabelColorSchema.optional(),
  updatedAt: z.date(),
});

// Type exports
export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export type EmailBody = z.infer<typeof EmailBodySchema>;
export type Email = z.infer<typeof EmailSchema>;
export type LabelColor = z.infer<typeof LabelColorSchema>;
export type Label = z.infer<typeof LabelSchema>;
