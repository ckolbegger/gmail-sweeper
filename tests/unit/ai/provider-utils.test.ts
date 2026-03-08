/**
 * R007: Unit tests for createProviderConfig()
 */

import { describe, it, expect } from 'vitest';
import { createProviderConfig } from '../../../src/core/ai/provider-utils.js';
import type { AiProviderConfig } from '../../../src/core/ai/config.js';

describe('createProviderConfig', () => {
  it('should create provider config for Anthropic', () => {
    const inputConfig: AiProviderConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      apiKey: 'test-key',
      maxContextTokens: 32000,
    };

    const result = createProviderConfig(inputConfig);

    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4-5-20250929');
    expect(result.apiKey).toBe('test-key');
    expect(result.maxContextTokens).toBe(32000);
    expect(result.baseUrl).toBeUndefined();
  });

  it('should create provider config for OpenAI', () => {
    const inputConfig: AiProviderConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      maxContextTokens: 64000,
    };

    const result = createProviderConfig(inputConfig);

    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.apiKey).toBe('test-key');
    expect(result.maxContextTokens).toBe(64000);
  });

  it('should include baseUrl when provided', () => {
    const inputConfig: AiProviderConfig = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      apiKey: 'test-key',
      maxContextTokens: 32000,
      baseUrl: 'https://custom.api.com/v1',
    };

    const result = createProviderConfig(inputConfig);

    expect(result.baseUrl).toBe('https://custom.api.com/v1');
  });

  it('should not include baseUrl when not provided', () => {
    const inputConfig: AiProviderConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      maxContextTokens: 32000,
    };

    const result = createProviderConfig(inputConfig);

    expect(result.baseUrl).toBeUndefined();
  });
});
