/**
 * Domain Interfaces for Smart Inbox Organizer
 * 
 * These interfaces decouple the UI (Ink/React) from the infrastructure
 * (Gmail API, Gemini API, File System), allowing easier testing and
 * future web migration.
 */

import type { Email, Workflow, FilterQuery } from '../data-model'; // Conceptual import

export interface IEmailService {
  /**
   * Authenticate with the provider.
   * @returns true if successful
   */
  authenticate(): Promise<boolean>;

  /**
   * Get a list of emails from the inbox.
   * @param limit Max number of emails to fetch (default 50)
   * @param pageToken Pagination token
   * @param query Optional Gmail search query (e.g., from AI)
   */
  listEmails(limit: number, pageToken?: string, query?: string): Promise<{
    emails: Email[];
    nextPageToken?: string;
  }>;

  /**
   * Get full details for a specific email.
   */
  getEmail(id: string): Promise<Email>;

  /**
   * Archive a list of emails.
   * @requires Confirmation in UI layer before calling.
   */
  archiveEmails(ids: string[]): Promise<void>;

  /**
   * Trash (delete) a list of emails.
   * @requires Confirmation in UI layer before calling.
   */
  deleteEmails(ids: string[]): Promise<void>;

  /**
   * Apply a label to a list of emails.
   */
  labelEmails(ids: string[], labelId: string): Promise<void>;
}

export interface IAIService {
  /**
   * Convert a natural language query into a structured filter.
   * Uses Gemini 3 Flash.
   */
  generateFilter(prompt: string): Promise<FilterQuery>;
}

export interface IWorkflowService {
  /**
   * Load all saved workflows.
   */
  loadWorkflows(): Promise<Workflow[]>;

  /**
   * Save a new or updated workflow.
   */
  saveWorkflow(workflow: Workflow): Promise<void>;

  /**
   * Delete a workflow by ID.
   */
  deleteWorkflow(id: string): Promise<void>;

  /**
   * Update the order of workflows.
   */
  reorderWorkflows(ids: string[]): Promise<void>;
}
