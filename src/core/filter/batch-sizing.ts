export function estimateTokens(text: string): number {
  return Math.floor(text.length / 4);
}

export function calculateBatchSize(
  emails: any[],
  maxContextTokens: number
): number {
  const EMAIL_BUDGET_RATIO = 0.7;
  const emailBudget = maxContextTokens * EMAIL_BUDGET_RATIO;

  if (emails.length === 0) {
    return 1;
  }

  // Estimate tokens for each email based on subject primarily
  const totalTokens = emails.reduce((sum, email) => {
    return sum + estimateTokens(email.subject || '');
  }, 0);

  const avgTokensPerEmail = totalTokens / emails.length;
  const batchSize = Math.floor(emailBudget / avgTokensPerEmail);

  // Ensure at least 1 email can be processed
  return Math.max(1, Math.min(batchSize, emails.length));
}
