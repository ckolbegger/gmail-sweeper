/**
 * T008: Unit tests for resolveAiConfig()
 * Test: reads from env vars, missing AI_PROVIDER returns null, 
 * missing AI_API_KEY returns null, AI_MAX_CONTEXT_TOKENS defaults to 32000,
 * AI_BASE_URL optional
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveAiConfig } from '../../../src/core/ai/config.js';

describe('resolveAiConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.AI_PROVIDER;
    delete process.env.AI_MODEL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MAX_CONTEXT_TOKENS;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('should return null when AI_PROVIDER is not set', async () => {
    const config = await resolveAiConfig();
    expect(config).toBeNull();
  });

  it('should return null when AI_API_KEY is not set', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    const config = await resolveAiConfig();
    expect(config).toBeNull();
  });

  it('should read from env vars and return config', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_MODEL = 'claude-sonnet-4-5-20250929';
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_MAX_CONTEXT_TOKENS = '64000';

    const config = await resolveAiConfig();

    expect(config).not.toBeNull();
    expect(config?.provider).toBe('anthropic');
    expect(config?.model).toBe('claude-sonnet-4-5-20250929');
    expect(config?.apiKey).toBe('test-key');
    expect(config?.maxContextTokens).toBe(64000);
  });

  it('should default AI_MAX_CONTEXT_TOKENS to 32000', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'test-key';

    const config = await resolveAiConfig();

    expect(config?.maxContextTokens).toBe(32000);
  });

  it('should set AI_BASE_URL when provided', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_BASE_URL = 'https://custom.api.com/v1';

    const config = await resolveAiConfig();

    expect(config?.baseUrl).toBe('https://custom.api.com/v1');
  });

  it('should not include baseUrl when not provided', async () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.AI_API_KEY = 'test-key';

    const config = await resolveAiConfig();

    expect(config?.baseUrl).toBeUndefined();
  });
});
