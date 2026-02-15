/**
 * T016: Token estimation and batch sizing for AI classification
 */

import type { EmailMetadata } from '../ai/provider.js';

/**
 * Estimate token count from text (rough approximation: chars/4)
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate optimal batch size for email classification
 * Uses 70% of max context tokens for email data, 30% reserved for system prompt
 * 
 * @param avgEmailLength - Average length of email metadata in characters
 * @param maxContextTokens - Maximum context window size
 * @param systemPromptTokens - Tokens reserved for system prompt (default 30%)
 * @returns Recommended batch size
 */
export function calculateBatchSize(
  avgEmailLength: number,
  maxContextTokens: number,
  systemPromptTokens: number = Math.floor(maxContextTokens * 0.3)
): number {
  if (avgEmailLength <= 0) {
    return 1; // Minimum batch size
  }

  const emailTokensPerItem = Math.ceil(avgEmailLength / 4);
  const emailBudget = maxContextTokens - systemPromptTokens;
  
  const batchSize = Math.floor(emailBudget / emailTokensPerItem);
  
  // Return minimum of 1
  return Math.max(1, batchSize);
}

/**
 * Calculate batch size for a list of emails
 * @param emails - Array of email metadata
 * @param maxContextTokens - Maximum context tokens
 * @param systemPromptTokens - Reserved for system prompt
 * @returns Number of emails per batch
 */
export function calculateEmailBatchSize(
  emails: EmailMetadata[],
  maxContextTokens: number,
  systemPromptTokens: number = Math.floor(maxContextTokens * 0.3)
): number {
  if (emails.length === 0) {
    return 1;
  }

  // Calculate average email metadata length
  const totalLength = emails.reduce((sum, email) => {
    return sum + email.subject.length + email.sender.length + email.snippet.length;
  }, 0);
  
  const avgLength = Math.ceil(totalLength / emails.length);
  
  return calculateBatchSize(avgLength, maxContextTokens, systemPromptTokens);
}
