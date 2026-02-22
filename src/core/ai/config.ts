export type AiProviderConfig = {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxContextTokens: number;
};

export function resolveAiConfig(): AiProviderConfig | null {
  const provider = process.env.AI_PROVIDER?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const maxContextTokensStr = process.env.AI_MAX_CONTEXT_TOKENS?.trim();

  if (!provider || !apiKey) {
    return null;
  }

  const maxContextTokens = maxContextTokensStr
    ? parseInt(maxContextTokensStr, 10)
    : 32000;

  return {
    provider: provider as 'anthropic' | 'openai',
    apiKey,
    model: model || undefined,
    baseUrl: baseUrl || undefined,
    maxContextTokens,
  };
}
