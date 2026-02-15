import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../../src/services/ai/anthropic';
import Anthropic from '@anthropic-ai/sdk';

vi.mock('@anthropic-ai/sdk');

describe('AnthropicProvider', () => {
  const mockConfig = {
    provider: 'anthropic' as const,
    model: 'claude-3-haiku',
    apiKey: 'test-api-key',
  };

  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify emails successfully', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ text: JSON.stringify({
        results: [
          {
            emailId: '1',
            matches: true,
            confidence: 0.9,
            reasoning: 'Match'
          }
        ]
      }) }]
    });

    vi.mocked(Anthropic).mockImplementation(function() {
      return {
        messages: {
          create: mockCreate
        }
      } as any;
    });

    provider = new AnthropicProvider(mockConfig);

    const request = {
      filterDescription: 'test',
      emails: [{ id: '1', subject: 'S', senderName: 'N', senderEmail: 'E', snippet: 'Sn' }]
    };

    const response = await provider.classifyEmails(request);

    expect(response.results).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-3-haiku',
      messages: [expect.objectContaining({ role: 'user' })]
    }));
  });
});
