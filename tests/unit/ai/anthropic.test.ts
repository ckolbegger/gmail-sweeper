import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAiProvider,
  type AiProvider,
  type AiProviderConfig,
  type EmailMetadata,
  type EmailClassification,
} from '@/core/ai/provider.js';

// Mock client interface
interface MockAnthropicClient {
  messages: {
    create: ReturnType<typeof vi.fn>;
  };
}

describe('AnthropicProvider.classifyEmails', () => {
  let provider: AiProvider;
  let mockClient: MockAnthropicClient;

  const defaultConfig: AiProviderConfig = {
    provider: 'anthropic',
    apiKey: 'test-api-key',
  };

  const sampleEmails: EmailMetadata[] = [
    {
      id: 'email-1',
      subject: 'Your invoice is ready',
      senderName: 'Billing Dept',
      senderEmail: 'billing@company.com',
      snippet: 'Please review your invoice for this month',
    },
    {
      id: 'email-2',
      subject: 'Weekly newsletter',
      senderName: 'Newsletter',
      senderEmail: 'news@example.com',
      snippet: 'Here are this week top stories',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      messages: {
        create: vi.fn(),
      },
    };
    // Create provider with injected mock client
    provider = createAiProvider(defaultConfig, mockClient as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // --- Test: Correct API call parameters ---

  describe('API call parameters', () => {
    it('sends correct prompt to Anthropic API with default model', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { emailId: 'email-1', matches: true, confidence: 0.9 },
              { emailId: 'email-2', matches: false, confidence: 0.8 },
            ]),
          },
        ],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await provider.classifyEmails('billing emails', sampleEmails);

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
      const callArgs = mockClient.messages.create.mock.calls[0][0];

      // Verify required API parameters
      expect(callArgs).toHaveProperty('model');
      expect(callArgs).toHaveProperty('max_tokens');
      expect(callArgs).toHaveProperty('system');
      expect(callArgs).toHaveProperty('messages');

      // Verify messages structure
      expect(callArgs.messages).toBeInstanceOf(Array);
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages[0].role).toBe('user');
      expect(callArgs.messages[0].content).toContain('billing emails');
    });

    it('uses custom model when specified in config', async () => {
      const customConfig: AiProviderConfig = {
        ...defaultConfig,
        model: 'claude-3-opus-20240229',
      };
      provider = createAiProvider(customConfig, mockClient as any);

      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await provider.classifyEmails('test filter', sampleEmails);

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      expect(callArgs.model).toBe('claude-3-opus-20240229');
    });

    it('includes email metadata in user message', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await provider.classifyEmails('test', sampleEmails);

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      const userContent = callArgs.messages[0].content;

      // Verify email data is included
      expect(userContent).toContain('email-1');
      expect(userContent).toContain('Your invoice is ready');
      expect(userContent).toContain('billing@company.com');
      expect(userContent).toContain('email-2');
    });

    it('includes system prompt with JSON format instructions', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await provider.classifyEmails('test', sampleEmails);

      const callArgs = mockClient.messages.create.mock.calls[0][0];

      expect(callArgs.system).toBeDefined();
      expect(callArgs.system.toLowerCase()).toContain('json');
    });
  });

  // --- Test: Response parsing ---

  describe('response parsing', () => {
    it('parses valid JSON response into EmailClassification[]', async () => {
      const mockClassifications = [
        { emailId: 'email-1', matches: true, confidence: 0.95, reasoning: 'Billing related' },
        { emailId: 'email-2', matches: false, confidence: 0.85, reasoning: 'Newsletter content' },
      ];

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockClassifications),
          },
        ],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const result = await provider.classifyEmails('billing emails', sampleEmails);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockClassifications[0]);
      expect(result[1]).toEqual(mockClassifications[1]);
    });

    it('parses response without optional reasoning field', async () => {
      const mockClassifications = [
        { emailId: 'email-1', matches: true, confidence: 0.9 },
        { emailId: 'email-2', matches: false, confidence: 0.7 },
      ];

      const mockResponse = {
        content: [{ type: 'text', text: JSON.stringify(mockClassifications) }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const result = await provider.classifyEmails('test', sampleEmails);

      expect(result).toHaveLength(2);
      expect(result[0].emailId).toBe('email-1');
      expect(result[0].matches).toBe(true);
      expect(result[0].confidence).toBe(0.9);
      expect(result[0].reasoning).toBeUndefined();
    });

    it('parses empty array response', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const result = await provider.classifyEmails('nothing matches', sampleEmails);

      expect(result).toEqual([]);
    });
  });

  // --- Test: Malformed response handling ---

  describe('malformed response handling', () => {
    it('handles non-JSON response gracefully', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'This is not valid JSON' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles JSON with wrong structure (not an array)', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: JSON.stringify({ not: 'an array' }) }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles JSON array with missing required fields', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { emailId: 'email-1', matches: true }, // missing confidence
            ]),
          },
        ],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles JSON array with wrong field types', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { emailId: 123, matches: 'yes', confidence: 'high' }, // wrong types
            ]),
          },
        ],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles response with no content blocks', async () => {
      const mockResponse = {
        content: [],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles response with non-text content type', async () => {
      const mockResponse = {
        content: [{ type: 'image', data: 'base64...' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });
  });

  // --- Test: API error handling ---

  describe('API error handling', () => {
    it('handles network error', async () => {
      const networkError = new Error('Network error');
      mockClient.messages.create.mockRejectedValueOnce(networkError);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow('Network error');
    });

    it('handles 401 authentication error', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockClient.messages.create.mockRejectedValueOnce(authError);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles 429 rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockClient.messages.create.mockRejectedValueOnce(rateLimitError);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles 500 server error', async () => {
      const serverError = new Error('Internal server error');
      (serverError as any).status = 500;
      mockClient.messages.create.mockRejectedValueOnce(serverError);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow();
    });

    it('handles timeout error', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockClient.messages.create.mockRejectedValueOnce(timeoutError);

      await expect(provider.classifyEmails('test', sampleEmails)).rejects.toThrow('Request timeout');
    });
  });

  // --- Test: Edge cases ---

  describe('edge cases', () => {
    it('handles empty email list', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const result = await provider.classifyEmails('any filter', []);

      expect(result).toEqual([]);
      // Should still make the API call
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('handles special characters in filter description', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const specialFilter = 'emails with "quotes" and \\backslash\\ and unicode: \u00e9\u00e0\u00fc';

      await provider.classifyEmails(specialFilter, sampleEmails);

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(specialFilter);
    });

    it('handles special characters in email content', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const emailsWithSpecialChars: EmailMetadata[] = [
        {
          id: 'email-special',
          subject: 'Re: [URGENT] "Quote" & <tags>',
          senderName: 'Test "User" \u00e9',
          senderEmail: 'test+special@example.com',
          snippet: 'Content with\nnewlines\tand\ttabs and \\backslash\\',
        },
      ];

      await provider.classifyEmails('test', emailsWithSpecialChars);

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
      const callArgs = mockClient.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('email-special');
    });

    it('handles very long filter description', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const longFilter = 'a'.repeat(5000);

      await provider.classifyEmails(longFilter, sampleEmails);

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('handles very long email snippet', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const emailWithLongSnippet: EmailMetadata[] = [
        {
          id: 'email-long',
          subject: 'Long email',
          senderName: 'Sender',
          senderEmail: 'sender@example.com',
          snippet: 'x'.repeat(10000),
        },
      ];

      await provider.classifyEmails('test', emailWithLongSnippet);

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('handles large batch of emails', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const largeEmailBatch: EmailMetadata[] = Array.from({ length: 100 }, (_, i) => ({
        id: `email-${i}`,
        subject: `Subject ${i}`,
        senderName: `Sender ${i}`,
        senderEmail: `sender${i}@example.com`,
        snippet: `Snippet for email ${i}`,
      }));

      await provider.classifyEmails('test', largeEmailBatch);

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
      const callArgs = mockClient.messages.create.mock.calls[0][0];
      // Verify all emails are included in the request
      expect(callArgs.messages[0].content).toContain('email-0');
      expect(callArgs.messages[0].content).toContain('email-99');
    });

    it('handles unicode and emoji in email content', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '[]' }],
      };
      mockClient.messages.create.mockResolvedValueOnce(mockResponse);

      const unicodeEmails: EmailMetadata[] = [
        {
          id: 'email-unicode',
          subject: '\u4e2d\u6587 \u65e5\u672c\u8a9e \ud55c\uad6d\uc5b4',
          senderName: '\ud83d\ude00 User',
          senderEmail: 'user@example.com',
          snippet: 'Hello \ud83c\udf89 emoji test',
        },
      ];

      await provider.classifyEmails('test', unicodeEmails);

      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });
  });
});
