/**
 * T018: Unit tests for AnthropicProvider.classifyEmails()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiProviderConfig, ClassifyEmailsRequest } from '../../../src/core/ai/provider.js';
import { AiProviderError } from '../../../src/core/errors.js';
import { buildSystemPrompt, buildUserPrompt } from '../../../src/core/ai/prompt.js';

// Mock the Anthropic SDK
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
    constructor(public opts: Record<string, unknown>) {}
  },
}));

// Import after mock setup
const { AnthropicProvider } = await import('../../../src/core/ai/anthropic.js');

const config: AiProviderConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  apiKey: 'test-api-key',
  baseUrl: 'https://custom.api.example.com',
};

const request: ClassifyEmailsRequest = {
  filterDescription: 'newsletters',
  emails: [
    {
      id: 'email-1',
      subject: 'Weekly Digest',
      senderName: 'News Co',
      senderEmail: 'news@example.com',
      snippet: 'Your weekly update...',
    },
  ],
};

const validResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        results: [
          { emailId: 'email-1', matches: true, confidence: 0.95, reasoning: 'Is a newsletter' },
        ],
      }),
    },
  ],
};

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(validResponse);
  });

  it('sends correct system and user prompts to Anthropic SDK', async () => {
    const provider = new AnthropicProvider(config);
    await provider.classifyEmails(request);

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toBe(buildSystemPrompt());
    expect(callArgs.messages).toEqual([
      { role: 'user', content: buildUserPrompt(request.filterDescription, request.emails) },
    ]);
    expect(callArgs.model).toBe(config.model);
    expect(callArgs.max_tokens).toBe(4096);
  });

  it('parses JSON response into EmailClassification[]', async () => {
    const provider = new AnthropicProvider(config);
    const result = await provider.classifyEmails(request);

    expect(result).toEqual({
      results: [
        { emailId: 'email-1', matches: true, confidence: 0.95, reasoning: 'Is a newsletter' },
      ],
    });
  });

  it('throws AiProviderError on malformed JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json{{{' }],
    });

    const provider = new AnthropicProvider(config);
    await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
    await expect(provider.classifyEmails(request)).rejects.toThrow(/malformed/i);
  });

  it('throws AiProviderError on Anthropic API error with statusCode', async () => {
    const apiError = new Error('Rate limited');
    Object.assign(apiError, { status: 429 });
    mockCreate.mockRejectedValue(apiError);

    const provider = new AnthropicProvider(config);

    try {
      await provider.classifyEmails(request);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AiProviderError);
      const aiErr = err as AiProviderError;
      expect(aiErr.provider).toBe('anthropic');
      expect(aiErr.statusCode).toBe(429);
    }
  });
});
