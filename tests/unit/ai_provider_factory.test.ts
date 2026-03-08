import { describe, expect, it } from 'vitest';

import { AnthropicProvider } from '@/adapters/ai/anthropic.js';
import { OpenAiProvider } from '@/adapters/ai/openai.js';
import { createAiProvider } from '@/adapters/ai/provider.js';

describe('ai provider factory', () => {
  it('should create AnthropicProvider for anthropic config', () => {
    const provider = createAiProvider({
      provider: 'anthropic',
      model: 'claude-sonnet',
      apiKey: 'test-key',
      maxContextTokens: 32000
    });

    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(typeof (provider as { summarizeEmail?: unknown }).summarizeEmail).toBe('function');
  });

  it('should create OpenAiProvider for openai config', () => {
    const provider = createAiProvider({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      maxContextTokens: 32000
    });

    expect(provider).toBeInstanceOf(OpenAiProvider);
    expect(typeof (provider as { summarizeEmail?: unknown }).summarizeEmail).toBe('function');
  });

  it('should throw for unsupported provider', () => {
    expect(() =>
      createAiProvider({
        provider: 'unknown' as 'openai',
        model: 'model',
        apiKey: 'test-key',
        maxContextTokens: 32000
      })
    ).toThrow('Unsupported AI provider');
  });
});
