/**
 * T009: Unit tests for createAiProvider() factory
 * Test: creates AnthropicProvider for 'anthropic', creates OpenAiProvider for 'openai',
 * throws on unsupported provider
 */

import { describe, it, expect } from 'vitest';
import { createAiProvider } from '../../../src/core/ai/provider.js';
import type { AiProviderConfig } from '../../../src/core/ai/config.js';

describe('createAiProvider', () => {
  const anthropicConfig: AiProviderConfig = {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    apiKey: 'test-anthropic-key',
    maxContextTokens: 32000,
  };

  const openaiConfig: AiProviderConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'test-openai-key',
    maxContextTokens: 32000,
  };

  it('should create AnthropicProvider for anthropic provider', () => {
    const provider = createAiProvider(anthropicConfig);
    expect(provider).toBeDefined();
    expect(provider.classifyEmails).toBeDefined();
  });

  it('should create OpenAiProvider for openai provider', () => {
    const provider = createAiProvider(openaiConfig);
    expect(provider).toBeDefined();
    expect(provider.classifyEmails).toBeDefined();
  });

  it('should throw on unsupported provider', () => {
    const invalidConfig = { ...anthropicConfig, provider: 'unknown' as 'anthropic' };
    expect(() => createAiProvider(invalidConfig)).toThrow('Unsupported AI provider: unknown');
  });
});
