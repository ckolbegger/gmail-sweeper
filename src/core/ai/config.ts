import type { AiProviderConfig } from './provider.js';

const SUPPORTED_PROVIDERS = ['anthropic', 'openai'] as const;

/**
 * Resolve AI provider configuration from environment variables.
 * Returns null if required variables (AI_PROVIDER, AI_API_KEY) are missing
 * or if AI_PROVIDER is not a supported value.
 */
export function resolveAiConfig(): AiProviderConfig | null {
  const provider = process.env['AI_PROVIDER'];
  const apiKey = process.env['AI_API_KEY'];

  if (!provider || !apiKey) {
    return null;
  }

  if (!SUPPORTED_PROVIDERS.includes(provider as 'anthropic' | 'openai')) {
    return null;
  }

  const model = process.env['AI_MODEL'] ?? '';
  const baseUrl = process.env['AI_BASE_URL'];
  const maxContextTokensRaw = process.env['AI_MAX_CONTEXT_TOKENS'];
  const maxContextTokens = maxContextTokensRaw
    ? parseInt(maxContextTokensRaw, 10)
    : 32000;

  const config: AiProviderConfig = {
    provider: provider as 'anthropic' | 'openai',
    model,
    apiKey,
    maxContextTokens,
  };
  if (baseUrl) config.baseUrl = baseUrl;
  return config;
}
