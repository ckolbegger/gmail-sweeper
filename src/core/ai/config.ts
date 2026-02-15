/**
 * T014: AI Provider configuration
 */

export interface AiProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens: number;
}

/**
 * T014: Resolve AI config from environment variables
 * @returns AiProviderConfig or null if not properly configured
 */
export async function resolveAiConfig(): Promise<AiProviderConfig | null> {
  const provider = process.env.AI_PROVIDER as 'anthropic' | 'openai' | undefined;
  const model = process.env.AI_MODEL;
  const baseUrl = process.env.AI_BASE_URL;
  const maxContextTokens = process.env.AI_MAX_CONTEXT_TOKENS
    ? parseInt(process.env.AI_MAX_CONTEXT_TOKENS, 10)
    : 32000;

  // Get API key based on provider
  let apiKey: string | undefined;
  if (provider === 'anthropic') {
    apiKey = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  } else if (provider === 'openai') {
    apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  }

  // Validate required fields
  if (!provider || !apiKey) {
    return null;
  }

  return {
    provider,
    model: model || (provider === 'anthropic' ? 'claude-sonnet-4-5-20250929' : 'gpt-4o'),
    apiKey,
    baseUrl,
    maxContextTokens: maxContextTokens || 32000,
  };
}
