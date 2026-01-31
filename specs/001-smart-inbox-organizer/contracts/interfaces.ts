import { z } from 'zod';

// Zod Schemas for Validation
export const EmailSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  sender: z.string(),
  subject: z.string(),
  date: z.date(),
  snippet: z.string(),
  isUnread: z.boolean(),
  labels: z.array(z.string()),
  matchReason: z.string().optional(),
});

export const FilterCriteriaSchema = z.object({
  targetDescription: z.string(),
  sensitivity: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
});

export const ActionRequestSchema = z.object({
  emailIds: z.array(z.string()),
  actionType: z.enum(['ARCHIVE', 'DELETE', 'LABEL']),
  labelName: z.string().optional(),
});

export const SavedWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetDescription: z.string(),
  actionTemplate: ActionRequestSchema.omit({ emailIds: true }).optional(),
  order: z.number(),
  lastRunAt: z.date().optional(),
});

export const MatchResultSchema = z.object({
  emailId: z.string(),
  isMatch: z.boolean(),
  reason: z.string(),
});

// Types inferred from Zod
export type Email = z.infer<typeof EmailSchema>;
export type FilterCriteria = z.infer<typeof FilterCriteriaSchema>;
export type ActionRequest = z.infer<typeof ActionRequestSchema>;
export type SavedWorkflow = z.infer<typeof SavedWorkflowSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;

// Interfaces
export interface GmailPort {
  authenticate(): Promise<void>;
  listEmails(maxResults?: number): Promise<Email[]>;
  getEmailBody(emailId: string): Promise<string>;
  batchArchive(emailIds: string[]): Promise<void>;
  batchDelete(emailIds: string[]): Promise<void>;
  batchAddLabel(emailIds: string[], label: string): Promise<void>;
}

export interface LLMPort {
  /**
   * Evaluates a batch of emails against the criteria.
   * Returns a list of results corresponding to the input emails.
   */
  batchEvaluate(emails: Email[], criteria: FilterCriteria): Promise<MatchResult[]>;
}

export interface WorkflowPort {
  saveWorkflow(workflow: Omit<SavedWorkflow, 'id'>): Promise<SavedWorkflow>;
  listWorkflows(): Promise<SavedWorkflow[]>;
  updateWorkflow(workflow: SavedWorkflow): Promise<SavedWorkflow>;
  deleteWorkflow(id: string): Promise<void>;
}