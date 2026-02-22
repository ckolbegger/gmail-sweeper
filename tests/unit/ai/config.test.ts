import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAiConfig } from '@/core/ai/config';
import type { AiProviderConfig } from '@/core/ai/config';

describe('resolveAiConfig', () => {
  beforeEach(() => {
    // Clear all AI-related environment variables before each test
    process.env.AI_PROVIDER = '';
    process.env.AI_MODEL = '';
    process.env.AI_API_KEY = '';
    process.env.AI_BASE_URL = '';
    process.env.AI_MAX_CONTEXT_TOKENS = '';
  });

  it('returns null when AI_PROVIDER is not set', () => {
    const config = resolveAiConfig();
    expect(config).toBeNull();
  });

  it('returns null when AI_API_KEY is not set', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4';
    // AI_API_KEY not set

    const config = resolveAiConfig();
    expect(config).toBeNull();
  });

  it('returns full config when all required env vars are set', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4';
    process.env.AI_API_KEY = 'sk-test-key';
    process.env.AI_BASE_URL = 'https://api.example.com';
    process.env.AI_MAX_CONTEXT_TOKENS = '16000';

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config).toEqual<AiProviderConfig>({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'sk-test-key',
      baseUrl: 'https://api.example.com',
      maxContextTokens: 16000,
    });
  });

  it('defaults AI_MAX_CONTEXT_TOKENS to 32000 when not set', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4';
    process.env.AI_API_KEY = 'sk-test-key';
    // AI_MAX_CONTEXT_TOKENS not set

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config?.maxContextTokens).toBe(32000);
  });

  it('has AI_BASE_URL as undefined when not set', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4';
    process.env.AI_API_KEY = 'sk-test-key';
    // AI_BASE_URL not set

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config?.baseUrl).toBeUndefined();
  });

  it('includes AI_BASE_URL when set', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_MODEL = 'gpt-4';
    process.env.AI_API_KEY = 'sk-test-key';
    process.env.AI_BASE_URL = 'https://custom.openai.com';

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config?.baseUrl).toBe('https://custom.openai.com');
  });
});
