/**
 * R007: AI Provider utilities
 */

import type { AiProviderConfig } from './config.js';

export interface ProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  maxContextTokens: number;
  baseUrl?: string;
}

/**
 * Create provider config from resolved AI config
 * @param config - Resolved AI config from environment
 * @returns Provider config suitable for creating AI providers
 */
export function createProviderConfig(config: AiProviderConfig): ProviderConfig {
  const providerConfig: ProviderConfig = {
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    maxContextTokens: config.maxContextTokens,
  };

  if (config.baseUrl) {
    providerConfig.baseUrl = config.baseUrl;
  }

  return providerConfig;
}
