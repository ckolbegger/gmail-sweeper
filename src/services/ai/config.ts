import { AiProviderConfig } from './provider';

/**
 * Resolve AI configuration from environment variables
 */
export function resolveAiConfig(): AiProviderConfig | null {
  const provider = process.env['AI_PROVIDER'];
  const model = process.env['AI_MODEL'];
  const apiKey = process.env['AI_API_KEY'];
  const baseUrl = process.env['AI_BASE_URL'];
  const maxContextTokens = process.env['AI_MAX_CONTEXT_TOKENS'];

  if (!provider || !apiKey || !model) {
    return null;
  }

  if (provider !== 'gemini' && provider !== 'anthropic' && provider !== 'openai') {
    return null;
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl: baseUrl || '',
    maxContextTokens: maxContextTokens ? parseInt(maxContextTokens, 10) : 32000
  };
}
