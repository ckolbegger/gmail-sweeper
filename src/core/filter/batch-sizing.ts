/**
 * Token estimation and batch sizing for AI email classification.
 */

import type { EmailMetadata } from '../ai/provider.js';

/** Estimate token count for a string using chars/4 heuristic. */
export function estimateTokens(text: string): number {
  return Math.floor(text.length / 4);
}

/**
 * Calculate how many emails fit in one batch given token budget.
 * @param emails - Array of email metadata to estimate tokens for
 * @param maxContextTokens - Total context window size (default: 32000)
 * @returns Number of emails per batch (minimum 1)
 */
export function calculateBatchSize(
  emails: EmailMetadata[],
  maxContextTokens = 32000,
): number {
  const emailBudget = maxContextTokens * 0.7;

  if (emails.length === 0) return 1;

  const totalTokens = emails.reduce((sum, email) => {
    const serialized = `${email.id} ${email.subject} ${email.senderName} ${email.senderEmail} ${email.snippet}`;
    return sum + estimateTokens(serialized);
  }, 0);

  const avgTokensPerEmail = totalTokens / emails.length;

  if (avgTokensPerEmail === 0) return emails.length;

  return Math.max(1, Math.floor(emailBudget / avgTokensPerEmail));
}
