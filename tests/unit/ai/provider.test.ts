/**
 * T009: Unit tests for createAiProvider() factory
 */

import { describe, it, expect } from 'vitest';
import {
  createAiProvider,
  AnthropicProvider,
  OpenAiProvider,
} from '../../../src/core/ai/provider.js';
import type { AiProviderConfig } from '../../../src/core/ai/provider.js';

describe('createAiProvider()', () => {
  const baseConfig: Omit<AiProviderConfig, 'provider'> = {
    model: 'test-model',
    apiKey: 'test-key',
  };

  it('creates AnthropicProvider for "anthropic"', () => {
    const config: AiProviderConfig = { ...baseConfig, provider: 'anthropic' };
    const provider = createAiProvider(config);
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('creates OpenAiProvider for "openai"', () => {
    const config: AiProviderConfig = { ...baseConfig, provider: 'openai' };
    const provider = createAiProvider(config);
    expect(provider).toBeInstanceOf(OpenAiProvider);
  });

  it('throws on unsupported provider', () => {
    const config = { ...baseConfig, provider: 'unsupported' as AiProviderConfig['provider'] };
    expect(() => createAiProvider(config)).toThrow();
  });
});
