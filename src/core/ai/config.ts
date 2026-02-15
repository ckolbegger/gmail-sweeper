import type { AiProviderConfig } from './provider.js';

/**
 * Resolve AI provider configuration from environment variables.
 * Returns null if required variables (AI_PROVIDER, AI_API_KEY) are missing.
 */
export function resolveAiConfig(): AiProviderConfig | null {
  const provider = process.env['AI_PROVIDER'];
  const apiKey = process.env['AI_API_KEY'];

  if (!provider || !apiKey) {
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
