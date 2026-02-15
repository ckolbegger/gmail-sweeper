import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveAiConfig } from '../../../../src/services/ai/config';

describe('resolveAiConfig', () => {
  beforeEach(() => {
    vi.stubEnv('AI_PROVIDER', 'gemini');
    vi.stubEnv('AI_MODEL', 'gemini-1.5-flash');
    vi.stubEnv('AI_API_KEY', 'test-key');
    vi.stubEnv('AI_BASE_URL', '');
    vi.stubEnv('AI_MAX_CONTEXT_TOKENS', '32000');
  });

  it('should return valid config when env vars are present', () => {
    const config = resolveAiConfig();
    expect(config).toEqual({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      apiKey: 'test-key',
      baseUrl: '',
      maxContextTokens: 32000
    });
  });

  it('should return null if AI_PROVIDER is missing', () => {
    vi.stubEnv('AI_PROVIDER', '');
    expect(resolveAiConfig()).toBeNull();
  });

  it('should return null if AI_API_KEY is missing', () => {
    vi.stubEnv('AI_API_KEY', '');
    expect(resolveAiConfig()).toBeNull();
  });

  it('should use default max context tokens if missing', () => {
    vi.stubEnv('AI_MAX_CONTEXT_TOKENS', '');
    const config = resolveAiConfig();
    expect(config?.maxContextTokens).toBe(32000);
  });
});
