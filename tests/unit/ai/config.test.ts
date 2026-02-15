import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveAiConfig } from '../../../src/core/ai/config.js';

describe('resolveAiConfig()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reads all config from env vars', () => {
    process.env['AI_PROVIDER'] = 'anthropic';
    process.env['AI_MODEL'] = 'claude-sonnet-4-5-20250929';
    process.env['AI_API_KEY'] = 'sk-test-key';
    process.env['AI_BASE_URL'] = 'https://api.anthropic.com';
    process.env['AI_MAX_CONTEXT_TOKENS'] = '64000';

    const config = resolveAiConfig();

    expect(config).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      apiKey: 'sk-test-key',
      baseUrl: 'https://api.anthropic.com',
      maxContextTokens: 64000,
    });
  });

  it('returns null when AI_PROVIDER is missing', () => {
    delete process.env['AI_PROVIDER'];
    process.env['AI_API_KEY'] = 'sk-test-key';
    process.env['AI_MODEL'] = 'some-model';

    const config = resolveAiConfig();
    expect(config).toBeNull();
  });

  it('returns null when AI_API_KEY is missing', () => {
    process.env['AI_PROVIDER'] = 'openai';
    delete process.env['AI_API_KEY'];
    process.env['AI_MODEL'] = 'gpt-4';

    const config = resolveAiConfig();
    expect(config).toBeNull();
  });

  it('defaults AI_MAX_CONTEXT_TOKENS to 32000', () => {
    process.env['AI_PROVIDER'] = 'anthropic';
    process.env['AI_MODEL'] = 'claude-sonnet-4-5-20250929';
    process.env['AI_API_KEY'] = 'sk-test-key';
    delete process.env['AI_MAX_CONTEXT_TOKENS'];

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config!.maxContextTokens).toBe(32000);
  });

  it('AI_BASE_URL is optional', () => {
    process.env['AI_PROVIDER'] = 'openai';
    process.env['AI_MODEL'] = 'gpt-4';
    process.env['AI_API_KEY'] = 'sk-test-key';
    delete process.env['AI_BASE_URL'];

    const config = resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config!.baseUrl).toBeUndefined();
  });
});
