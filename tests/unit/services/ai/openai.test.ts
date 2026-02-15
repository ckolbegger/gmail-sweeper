import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAiProvider } from '../../../../src/services/ai/openai';
import OpenAI from 'openai';

vi.mock('openai');

describe('OpenAiProvider', () => {
  const mockConfig = {
    provider: 'openai' as const,
    model: 'gpt-4o',
    apiKey: 'test-api-key',
  };

  let provider: OpenAiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify emails successfully', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        results: [
          {
            emailId: '1',
            matches: true,
            confidence: 0.9,
            reasoning: 'Match'
          }
        ]
      }) } }]
    });

    vi.mocked(OpenAI).mockImplementation(function() {
      return {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      } as any;
    });

    provider = new OpenAiProvider(mockConfig);

    const request = {
      filterDescription: 'test',
      emails: [{ id: '1', subject: 'S', senderName: 'N', senderEmail: 'E', snippet: 'Sn' }]
    };

    const response = await provider.classifyEmails(request);

    expect(response.results).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o',
      response_format: { type: 'json_object' }
    }));
  });
});
