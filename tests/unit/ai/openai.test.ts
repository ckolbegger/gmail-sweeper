/**
 * T026: Unit tests for OpenAiProvider.classifyEmails()
 * Tests: sends correct prompt, parses JSON response, handles malformed response, handles API error, respects baseUrl
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmailMetadata, EmailClassification } from '../../src/core/ai/provider.js';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

const mockOpenAi = vi.mocked(await import('openai'));

describe('OpenAiProvider', () => {
  let OpenAiProvider: new (config: {
    model: string;
    apiKey: string;
    baseUrl?: string;
    maxContextTokens: number;
  }) => {
    classifyEmails: (
      filterDescription: string,
      emails: EmailMetadata[],
      signal?: AbortSignal
    ) => Promise<EmailClassification[]>;
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const provider = await import('../../src/core/ai/openai.js');
    OpenAiProvider = provider.OpenAiProvider;
  });

  const mockEmails: EmailMetadata[] = [
    {
      id: 'email-1',
      subject: 'Meeting request',
      sender: 'alice@example.com',
      snippet: 'Can we schedule a meeting?',
    },
    {
      id: 'email-2',
      subject: 'Newsletter',
      sender: 'newsletter@company.com',
      snippet: 'Weekly updates...',
    },
  ];

  describe('classifyEmails', () => {
    it('should send correct prompt to the API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  emailId: 'email-1',
                  matches: true,
                  confidence: 0.9,
                  reason: 'Meeting request detected',
                },
                {
                  emailId: 'email-2',
                  matches: false,
                  confidence: 0.1,
                  reason: 'Newsletter content',
                },
              ]),
            },
          },
        ],
      };

      const mockChatCompletionsCreate = vi.fn().mockResolvedValue(mockResponse);
      mockOpenAi.default.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockChatCompletionsCreate,
          },
        },
      }));

      const provider = new OpenAiProvider({
        model: 'gpt-4o',
        apiKey: 'test-api-key',
        maxContextTokens: 32000,
      });

      await provider.classifyEmails('Meeting requests', mockEmails);

      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockChatCompletionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-4o');
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');
      expect(callArgs.messages[1].content).toContain('Meeting requests');
      expect(callArgs.messages[1].content).toContain('email-1');
      expect(callArgs.messages[1].content).toContain('email-2');
    });

    it('should parse JSON response into EmailClassification[]', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  emailId: 'email-1',
                  matches: true,
                  confidence: 0.9,
                  reason: 'Meeting request detected',
                },
                {
                  emailId: 'email-2',
                  matches: false,
                  confidence: 0.1,
                  reason: 'Newsletter content',
                },
              ]),
            },
          },
        ],
      };

      const mockChatCompletionsCreate = vi.fn().mockResolvedValue(mockResponse);
      mockOpenAi.default.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockChatCompletionsCreate,
          },
        },
      }));

      const provider = new OpenAiProvider({
        model: 'gpt-4o',
        apiKey: 'test-api-key',
        maxContextTokens: 32000,
      });

      const result = await provider.classifyEmails('Meeting requests', mockEmails);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        emailId: 'email-1',
        matches: true,
        confidence: 0.9,
        confidenceLevel: 'high',
        reasoning: 'Meeting request detected',
      });
      expect(result[1]).toEqual({
        emailId: 'email-2',
        matches: false,
        confidence: 0.1,
        confidenceLevel: 'low',
        reasoning: 'Newsletter content',
      });
    });

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'not valid json',
            },
          },
        ],
      };

      const mockChatCompletionsCreate = vi.fn().mockResolvedValue(mockResponse);
      mockOpenAi.default.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockChatCompletionsCreate,
          },
        },
      }));

      const provider = new OpenAiProvider({
        model: 'gpt-4o',
        apiKey: 'test-api-key',
        maxContextTokens: 32000,
      });

      await expect(provider.classifyEmails('test filter', mockEmails)).rejects.toThrow(
        'Failed to parse AI response'
      );
    });

    it('should handle API error', async () => {
      const mockChatCompletionsCreate = vi
        .fn()
        .mockRejectedValue(new Error('API rate limit exceeded'));
      mockOpenAi.default.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockChatCompletionsCreate,
          },
        },
      }));

      const provider = new OpenAiProvider({
        model: 'gpt-4o',
        apiKey: 'test-api-key',
        maxContextTokens: 32000,
      });

      await expect(provider.classifyEmails('test filter', mockEmails)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should respect baseUrl config', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([]),
            },
          },
        ],
      };

      const mockChatCompletionsCreate = vi.fn().mockResolvedValue(mockResponse);
      mockOpenAi.default.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockChatCompletionsCreate,
          },
        },
      }));

      const provider = new OpenAiProvider({
        model: 'gpt-4o',
        apiKey: 'test-api-key',
        baseUrl: 'https://custom.openai.example.com/v1',
        maxContextTokens: 32000,
      });

      await provider.classifyEmails('test filter', mockEmails);

      expect(mockOpenAi.default).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.openai.example.com/v1',
      });
    });
  });
});
