export type AiProviderType = 'anthropic' | 'openai';

export interface AiProviderConfig {
  provider: AiProviderType;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens: number;
}

const DEFAULT_MAX_CONTEXT_TOKENS = 32000;

export function resolveAiConfig(): AiProviderConfig | null {
  const provider = process.env.AI_PROVIDER as AiProviderType | undefined;
  const model = process.env.AI_MODEL;
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const maxContextTokensStr = process.env.AI_MAX_CONTEXT_TOKENS;

  if (!provider) {
    return null;
  }

  if (!apiKey) {
    return null;
  }

  if (!model) {
    return null;
  }

  const maxContextTokens = maxContextTokensStr
    ? parseInt(maxContextTokensStr, 10)
    : DEFAULT_MAX_CONTEXT_TOKENS;

  const config: AiProviderConfig = {
    provider,
    model,
    apiKey,
    maxContextTokens,
  };

  if (baseUrl) {
    config.baseUrl = baseUrl;
  }

  return config;
}
