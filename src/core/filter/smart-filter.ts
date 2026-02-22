import type { Email } from '../models/email.js';
import type { AiProvider, EmailClassification, EmailMetadata } from '../ai/provider.js';
import { calculateBatchSize } from './batch-sizing.js';

export interface SmartFilterOptions {
  emails: Email[];
  description: string;
  provider: AiProvider;
  maxContextTokens: number;
  onProgress?: (processed: number, total: number) => void;
  signal?: AbortSignal;
}

export interface SmartFilterResult {
  classifications: EmailClassification[];
  filteredEmails: Email[];
}

/**
 * Run smart filter on a list of emails using AI classification.
 *
 * @param options - Smart filter options
 * @returns Classification results and filtered emails sorted by confidence
 * @throws Error if description is empty (FR-013)
 */
export async function runSmartFilter(options: SmartFilterOptions): Promise<SmartFilterResult> {
  const { emails, description, provider, maxContextTokens, onProgress, signal } = options;

  // FR-013: Reject empty description
  if (!description || description.trim() === '') {
    throw new Error('Filter description cannot be empty');
  }

  // Handle empty email list
  if (emails.length === 0) {
    return {
      classifications: [],
      filteredEmails: [],
    };
  }

  // Calculate batch size based on token limits
  const batchSize = calculateBatchSize(emails, maxContextTokens);

  const allClassifications: EmailClassification[] = [];
  let processed = 0;

  // Process emails in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    // Check for cancellation before each batch
    if (signal?.aborted) {
      throw new Error('Smart filter operation was aborted');
    }

    const batch = emails.slice(i, i + batchSize);

    // Convert Email to EmailMetadata for AI provider
    const emailMetadata: EmailMetadata[] = batch.map((email) => ({
      id: email.id,
      subject: email.subject,
      senderName: email.sender.name ?? '',
      senderEmail: email.sender.email,
      snippet: email.snippet,
    }));

    // Classify batch
    const batchResults = await provider.classifyEmails(description, emailMetadata);
    allClassifications.push(...batchResults);

    processed += batch.length;

    // Call progress callback after each batch
    if (onProgress) {
      onProgress(processed, emails.length);
    }
  }

  // Sort all classifications by confidence descending
  allClassifications.sort((a, b) => b.confidence - a.confidence);

  // Create map of email id to email for quick lookup
  const emailMap = new Map<string, Email>();
  for (const email of emails) {
    emailMap.set(email.id, email);
  }

  // Build filtered emails list (matches=true) sorted by confidence
  const filteredEmails: Email[] = [];
  for (const classification of allClassifications) {
    if (classification.matches) {
      const email = emailMap.get(classification.emailId);
      if (email) {
        filteredEmails.push(email);
      }
    }
  }

  return {
    classifications: allClassifications,
    filteredEmails,
  };
}
