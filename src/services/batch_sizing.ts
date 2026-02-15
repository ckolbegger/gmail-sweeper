const DEFAULT_MAX_CONTEXT_TOKENS = 32000;
const EMAIL_TOKEN_BUDGET_RATIO = 0.7;

export function estimateTokens(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  return Math.ceil(content.length / 4);
}

export function calculateBatchSize(
  emailTokenEstimates: number[],
  maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS
): number {
  const usableBudget = Math.floor(maxContextTokens * EMAIL_TOKEN_BUDGET_RATIO);
  const safeEstimates = emailTokenEstimates.filter((value) => Number.isFinite(value) && value > 0);
  const estimate = safeEstimates.length > 0 ? Math.ceil(safeEstimates[0] ?? usableBudget) : usableBudget;
  const computed = Math.floor(usableBudget / estimate);

  return Math.max(1, computed);
}
