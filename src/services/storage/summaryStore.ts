import type { EmailSummary } from '../../types';

export interface ISummaryStorage {
  getSummary(emailId: string): Promise<EmailSummary | null>;
  saveSummary(summary: EmailSummary): Promise<void>;
}
