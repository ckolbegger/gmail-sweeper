import { describe, it, expect } from 'vitest';
import { createAiProvider } from '../../../src/core/ai/provider.js';
import type { AiProviderConfig } from '../../../src/core/ai/config.js';

describe('createAiProvider', () => {
  it('should create AnthropicProvider for anthropic provider type', () => {
    const config: AiProviderConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      apiKey: 'test-key',
      maxContextTokens: 32000,
    };

    const provider = createAiProvider(config);

    expect(provider).toBeDefined();
    expect(provider.constructor.name).toBe('AnthropicProvider');
  });

  it('should create OpenAiProvider for openai provider type', () => {
    const config: AiProviderConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      maxContextTokens: 32000,
    };

    const provider = createAiProvider(config);

    expect(provider).toBeDefined();
    expect(provider.constructor.name).toBe('OpenAiProvider');
  });

  it('should throw error for unsupported provider', () => {
    const config = {
      provider: 'unsupported' as const,
      model: 'some-model',
      apiKey: 'test-key',
      maxContextTokens: 32000,
    };

    expect(() => createAiProvider(config as AiProviderConfig)).toThrow(
      'Unsupported AI provider: unsupported'
    );
  });

  it('should pass config to AnthropicProvider', () => {
    const config: AiProviderConfig = {
      provider: 'anthropic',
      model: 'claude-opus-4-5-20250929',
      apiKey: 'anthropic-key',
      maxContextTokens: 64000,
    };

    const provider = createAiProvider(config);

    expect(provider).toBeDefined();
    expect(provider.constructor.name).toBe('AnthropicProvider');
  });

  it('should pass baseUrl to OpenAiProvider', () => {
    const config: AiProviderConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'openai-key',
      baseUrl: 'https://custom.openai.com/v1',
      maxContextTokens: 32000,
    };

    const provider = createAiProvider(config);

    expect(provider).toBeDefined();
    expect(provider.constructor.name).toBe('OpenAiProvider');
  });
});
