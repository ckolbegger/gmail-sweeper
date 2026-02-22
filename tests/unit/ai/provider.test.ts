import { describe, it, expect } from 'vitest';
import { createAiProvider, type AiProvider, type AiProviderConfig } from '@/core/ai/provider.js';

describe('createAiProvider', () => {
  it('creates AnthropicProvider when provider is "anthropic"', () => {
    const config: AiProviderConfig = {
      provider: 'anthropic',
      apiKey: 'test-key',
    };

    const provider = createAiProvider(config);

    expect(provider).toBeDefined();
    expect(provider).toHaveProperty('classifyEmails');
    expect(provider.constructor.name).toBe('AnthropicProvider');
  });

  it('creates OpenAiProvider when provider is "openai"', () => {
    const config: AiProviderConfig = {
      provider: 'openai',
      apiKey: 'test-key',
    };

    const provider = createAiProvider(config);

    expect(provider).toBeDefined();
    expect(provider).toHaveProperty('classifyEmails');
    expect(provider.constructor.name).toBe('OpenAiProvider');
  });

  it('throws error for unsupported provider', () => {
    const config: AiProviderConfig = {
      provider: 'invalid' as any,
      apiKey: 'test-key',
    };

    expect(() => createAiProvider(config)).toThrow('Unsupported AI provider: invalid');
  });

  it('returned provider has classifyEmails method', () => {
    const config: AiProviderConfig = {
      provider: 'anthropic',
      apiKey: 'test-key',
    };

    const provider = createAiProvider(config);

    expect(typeof provider.classifyEmails).toBe('function');
  });
});
