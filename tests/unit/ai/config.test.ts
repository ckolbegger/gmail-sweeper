import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveAiConfig } from '../../../src/core/ai/config.js';

describe('resolveAiConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should read config from environment variables', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_MODEL = 'claude-sonnet-4-5-20250929';
    process.env.AI_API_KEY = 'test-api-key';
    process.env.AI_BASE_URL = 'https://api.anthropic.com';
    process.env.AI_MAX_CONTEXT_TOKENS = '64000';

    const config = resolveAiConfig();

    expect(config).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.anthropic.com',
      maxContextTokens: 64000,
    });
  });

  it('should return null when AI_PROVIDER is missing', () => {
    delete process.env.AI_PROVIDER;
    process.env.AI_MODEL = 'gpt-4o';
    process.env.AI_API_KEY = 'test-api-key';

    const config = resolveAiConfig();

    expect(config).toBeNull();
  });

  it('should return null when AI_API_KEY is missing', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4o';
    delete process.env.AI_API_KEY;

    const config = resolveAiConfig();

    expect(config).toBeNull();
  });

  it('should default AI_MAX_CONTEXT_TOKENS to 32000', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_MODEL = 'claude-sonnet-4-5-20250929';
    process.env.AI_API_KEY = 'test-api-key';
    delete process.env.AI_MAX_CONTEXT_TOKENS;

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config!.maxContextTokens).toBe(32000);
  });

  it('should make AI_BASE_URL optional', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4o';
    process.env.AI_API_KEY = 'test-api-key';
    delete process.env.AI_BASE_URL;

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config!.baseUrl).toBeUndefined();
  });

  it('should support openai provider', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4o';
    process.env.AI_API_KEY = 'sk-test-key';

    const config = resolveAiConfig();

    expect(config).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-test-key',
      maxContextTokens: 32000,
    });
  });
});
