import { describe, it, expect } from 'vitest';
import { createAiProvider, AiProviderConfig } from '../../../../src/services/ai/provider';
import { GeminiProvider } from '../../../../src/services/ai/gemini';
import { AnthropicProvider } from '../../../../src/services/ai/anthropic';
import { OpenAiProvider } from '../../../../src/services/ai/openai';

describe('createAiProvider', () => {
  it('should create a GeminiProvider for gemini', () => {
    const config: AiProviderConfig = { provider: 'gemini', model: 'm', apiKey: 'k' };
    const provider = createAiProvider(config);
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it('should create an AnthropicProvider for anthropic', () => {
    const config: AiProviderConfig = { provider: 'anthropic', model: 'm', apiKey: 'k' };
    const provider = createAiProvider(config);
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('should create an OpenAiProvider for openai', () => {
    const config: AiProviderConfig = { provider: 'openai', model: 'm', apiKey: 'k' };
    const provider = createAiProvider(config);
    expect(provider).toBeInstanceOf(OpenAiProvider);
  });
});
