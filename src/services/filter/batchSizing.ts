import { EmailMetadata } from '../ai/provider';

/**
 * Estimate token count using chars/4 heuristic
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate the number of emails that can fit into a single request
 */
export function calculateBatchSize(emails: EmailMetadata[], totalBudget: number): number {
  if (emails.length === 0) return 0;

  // Reserve 30% for system instructions, description, and response
  const emailBudget = totalBudget * 0.7;
  
  // Estimate average tokens per email
  const sampleSize = Math.min(emails.length, 5);
  let totalSampleTokens = 0;
  for (let i = 0; i < sampleSize; i++) {
    totalSampleTokens += estimateTokens(JSON.stringify(emails[i]));
  }
  
  const avgTokensPerEmail = totalSampleTokens / sampleSize;
  const batchSize = Math.floor(emailBudget / avgTokensPerEmail);

  return Math.max(1, Math.min(batchSize, emails.length));
}
