import { describe, expect, it } from 'vitest';

import { resolveAiConfig } from '@/core/config.js';

describe('ai config resolution', () => {
  it('should read AI config from environment values', () => {
    const config = resolveAiConfig({
      AI_PROVIDER: 'anthropic',
      AI_MODEL: 'claude-sonnet',
      AI_API_KEY: 'test-key',
      AI_BASE_URL: 'https://example.local/v1',
      AI_MAX_CONTEXT_TOKENS: '64000'
    });

    expect(config).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet',
      apiKey: 'test-key',
      baseUrl: 'https://example.local/v1',
      maxContextTokens: 64000
    });
  });

  it('should return null when AI_PROVIDER is missing', () => {
    const config = resolveAiConfig({
      AI_MODEL: 'gpt-4o',
      AI_API_KEY: 'test-key'
    });

    expect(config).toBeNull();
  });

  it('should return null when AI_API_KEY is missing', () => {
    const config = resolveAiConfig({
      AI_PROVIDER: 'openai',
      AI_MODEL: 'gpt-4o'
    });

    expect(config).toBeNull();
  });

  it('should default AI_MAX_CONTEXT_TOKENS to 32000', () => {
    const config = resolveAiConfig({
      AI_PROVIDER: 'openai',
      AI_MODEL: 'gpt-4o',
      AI_API_KEY: 'test-key'
    });

    expect(config?.maxContextTokens).toBe(32000);
  });

  it('should keep AI_BASE_URL optional', () => {
    const config = resolveAiConfig({
      AI_PROVIDER: 'openai',
      AI_MODEL: 'gpt-4o',
      AI_API_KEY: 'test-key'
    });

    expect(config).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'test-key',
      baseUrl: undefined,
      maxContextTokens: 32000
    });
  });
});
