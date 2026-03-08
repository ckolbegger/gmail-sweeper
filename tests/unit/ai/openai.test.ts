/**
 * T019: Unit tests for OpenAiProvider.classifyEmails()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiProviderConfig, EmailMetadata } from '../../../src/core/ai/provider.js';
import { AiProviderError } from '../../../src/core/errors.js';
import { buildSystemPrompt, buildUserPrompt } from '../../../src/core/ai/prompt.js';

// Mock the openai module
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } };
      constructor(public opts: Record<string, unknown>) {}
    },
  };
});

// Import after mocking
const { OpenAiProvider } = await import('../../../src/core/ai/openai.js');

const baseConfig: AiProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'test-key-123',
};

const testEmails: EmailMetadata[] = [
  {
    id: 'msg-1',
    subject: 'Meeting tomorrow',
    senderName: 'Alice',
    senderEmail: 'alice@example.com',
    snippet: 'Hey, can we meet tomorrow?',
  },
  {
    id: 'msg-2',
    subject: 'Invoice #1234',
    senderName: 'Bob',
    senderEmail: 'bob@example.com',
    snippet: 'Please find attached invoice.',
  },
];

const validResponse = {
  results: [
    { emailId: 'msg-1', matches: true, confidence: 0.95, reasoning: 'Matches filter' },
    { emailId: 'msg-2', matches: false, confidence: 0.1, reasoning: 'Does not match' },
  ],
};

describe('OpenAiProvider.classifyEmails()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends correct system prompt and user prompt to OpenAI SDK', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validResponse) } }],
    });

    const provider = new OpenAiProvider(baseConfig);
    await provider.classifyEmails({ filterDescription: 'meeting invites', emails: testEmails });

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe('gpt-4o-mini');
    expect(callArgs.messages).toEqual([
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt('meeting invites', testEmails) },
    ]);
  });

  it('parses JSON response into EmailClassification[]', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validResponse) } }],
    });

    const provider = new OpenAiProvider(baseConfig);
    const result = await provider.classifyEmails({
      filterDescription: 'meeting invites',
      emails: testEmails,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      emailId: 'msg-1',
      matches: true,
      confidence: 0.95,
      reasoning: 'Matches filter',
    });
    expect(result.results[1]).toEqual({
      emailId: 'msg-2',
      matches: false,
      confidence: 0.1,
      reasoning: 'Does not match',
    });
  });

  it('throws AiProviderError on malformed JSON response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not valid json {{{' } }],
    });

    const provider = new OpenAiProvider(baseConfig);
    await expect(
      provider.classifyEmails({ filterDescription: 'test', emails: testEmails }),
    ).rejects.toThrow(AiProviderError);

    try {
      await provider.classifyEmails({ filterDescription: 'test', emails: testEmails });
    } catch (err) {
      expect(err).toBeInstanceOf(AiProviderError);
      expect((err as AiProviderError).provider).toBe('openai');
    }
  });

  it('throws AiProviderError with statusCode on OpenAI API error', async () => {
    const apiError = new Error('Rate limit exceeded');
    (apiError as Record<string, unknown>).status = 429;
    mockCreate.mockRejectedValueOnce(apiError);

    const provider = new OpenAiProvider(baseConfig);
    await expect(
      provider.classifyEmails({ filterDescription: 'test', emails: testEmails }),
    ).rejects.toThrow(AiProviderError);

    mockCreate.mockRejectedValueOnce(apiError);
    try {
      await provider.classifyEmails({ filterDescription: 'test', emails: testEmails });
    } catch (err) {
      expect(err).toBeInstanceOf(AiProviderError);
      expect((err as AiProviderError).provider).toBe('openai');
      expect((err as AiProviderError).statusCode).toBe(429);
    }
  });

  it('respects baseUrl config for OpenAI-compatible APIs', () => {
    const config: AiProviderConfig = {
      ...baseConfig,
      baseUrl: 'https://my-custom-api.example.com/v1',
    };
    const provider = new OpenAiProvider(config);
    // Access the underlying client's opts to verify baseURL was passed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (provider as any).client;
    expect(client.opts.baseURL).toBe('https://my-custom-api.example.com/v1');
  });
});
