import { Email } from '../../types';

export interface EmailSummary {
  emailId: string;
  description: string;
  actionItems: string[];
  createdAt: string;
}

export interface SummarizeEmailRequest {
  email: Email;
}

export interface SummarizeEmailResponse {
  summary: EmailSummary;
}

// Extension to the existing AiProvider interface
export interface IAiProviderExtensions {
  summarizeEmail(request: SummarizeEmailRequest): Promise<SummarizeEmailResponse>;
}

export interface ISummaryStorage {
  /**
   * Retrieves a cached summary by email ID.
   */
  getSummary(emailId: string): Promise<EmailSummary | null>;

  /**
   * Saves a summary to persistent storage.
   */
  saveSummary(summary: EmailSummary): Promise<void>;
}
