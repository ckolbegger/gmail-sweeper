import { describe, expect, it, vi } from 'vitest';

import { OpenAiProvider } from '@/adapters/ai/openai.js';
import { AiProviderError } from '@/core/errors.js';

interface OpenAiClientMock {
  responses: {
    create: ReturnType<typeof vi.fn>;
  };
}

function createProvider(create: ReturnType<typeof vi.fn>): OpenAiProvider {
  const Provider = OpenAiProvider as unknown as new (
    config: {
      provider: 'openai';
      model: string;
      apiKey: string;
      maxContextTokens: number;
    },
    deps: { client: OpenAiClientMock }
  ) => OpenAiProvider;

  return new Provider(
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
      maxContextTokens: 32000
    },
    {
      client: {
        responses: {
          create
        }
      }
    }
  );
}

describe('OpenAiProvider', () => {
  it('should classify emails and parse JSON results', async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        results: [
          {
            emailId: 'msg-2',
            matches: true,
            confidence: 0.87,
            reasoning: 'Contains invoice details'
          }
        ]
      })
    });
    const provider = createProvider(create);

    const response = await provider.classifyEmails({
      filterDescription: 'purchase receipts',
      emails: [
        {
          messageId: 'msg-2',
          subject: 'Invoice #123',
          sender: 'billing@example.com',
          snippet: 'Payment received'
        }
      ]
    });

    expect(response).toEqual({
      results: [
        {
          emailId: 'msg-2',
          matches: true,
          confidence: 0.87,
          reasoning: 'Contains invoice details'
        }
      ]
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it('should throw AiProviderError for invalid JSON payloads', async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: '{invalid'
    });
    const provider = createProvider(create);

    await expect(
      provider.classifyEmails({
        filterDescription: 'anything',
        emails: [
          {
            messageId: 'msg-1',
            subject: 'Subject',
            sender: 'sender@example.com',
            snippet: 'Snippet'
          }
        ]
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('Invalid')
    } satisfies Partial<AiProviderError>);
  });

  it('should short-circuit empty email batches', async () => {
    const create = vi.fn();
    const provider = createProvider(create);

    const response = await provider.classifyEmails({
      filterDescription: 'anything',
      emails: []
    });

    expect(response).toEqual({ results: [] });
    expect(create).not.toHaveBeenCalled();
  });
});
