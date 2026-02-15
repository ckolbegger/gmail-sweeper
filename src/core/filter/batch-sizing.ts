const DEFAULT_MAX_CONTEXT_TOKENS = 32000;
const EMAIL_BUDGET_PERCENTAGE = 0.7;
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function calculateBatchSize(
  emails: Array<{ text: string }>,
  maxTokens: number = DEFAULT_MAX_CONTEXT_TOKENS
): number {
  if (emails.length === 0) {
    return 0;
  }

  const emailTokenBudget = Math.floor(maxTokens * EMAIL_BUDGET_PERCENTAGE);
  const tokensPerEmail = estimateTokens(emails[0].text);

  if (tokensPerEmail === 0) {
    return emails.length;
  }

  const maxEmailsInBudget = Math.floor(emailTokenBudget / tokensPerEmail);
  const batchSize = Math.max(1, Math.min(maxEmailsInBudget, emails.length));

  return batchSize;
}
