import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiProviderConfig } from '../../../src/core/ai/config.js';
import type { ClassificationRequest, EmailClassification } from '../../../src/core/ai/provider.js';
import { AiProviderError } from '../../../src/core/errors/index.js';

// Mock the Anthropic SDK
const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  }
  return {
    default: MockAnthropic,
    Anthropic: MockAnthropic,
  };
});

// Import after mocking
import { AnthropicProvider } from '../../../src/core/ai/anthropic.js';

describe('AnthropicProvider.classifyEmails()', () => {
  let config: AiProviderConfig;
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      apiKey: 'test-api-key',
      maxContextTokens: 32000,
    };

    provider = new AnthropicProvider(config);
  });

  describe('sends correct prompt', () => {
    it('should send system and user prompts to Anthropic API', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'emails about project updates',
        emails: [
          {
            id: 'email-1',
            subject: 'Project Update - Q1 2025',
            sender: { name: 'Alice', email: 'alice@example.com' },
            snippet: 'Here is the latest project status...',
          },
        ],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                emailId: 'email-1',
                matches: true,
                confidence: 0.95,
                reasoning: 'Clearly about project updates',
              },
            ]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.classifyEmails(request);

      expect(mockCreate).toHaveBeenCalledOnce();
      const callArgs = mockCreate.mock.calls[0][0];

      // Verify system message
      expect(callArgs.system).toBeDefined();
      expect(callArgs.system).toContain('email classification assistant');
      expect(callArgs.system).toContain('JSON');

      // Verify user message contains filter description
      expect(callArgs.messages).toBeDefined();
      expect(callArgs.messages[0].content).toContain('Project Update - Q1 2025');
      expect(callArgs.messages[0].content).toContain('emails about project updates');

      // Verify model is set
      expect(callArgs.model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should include all email metadata in the prompt', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'urgent emails',
        emails: [
          {
            id: 'email-1',
            subject: 'URGENT: Server Down',
            sender: { name: 'Bob', email: 'bob@example.com' },
            snippet: 'Production server is down',
          },
          {
            id: 'email-2',
            subject: 'Meeting Tomorrow',
            sender: { email: 'calendar@example.com' },
            snippet: 'You have a meeting scheduled',
          },
        ],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { emailId: 'email-1', matches: true, confidence: 0.9 },
              { emailId: 'email-2', matches: false, confidence: 0.2 },
            ]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.classifyEmails(request);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[0].content;

      // Verify both emails are in the prompt
      expect(userMessage).toContain('URGENT: Server Down');
      expect(userMessage).toContain('bob@example.com');
      expect(userMessage).toContain('Production server is down');
      expect(userMessage).toContain('Meeting Tomorrow');
      expect(userMessage).toContain('calendar@example.com');
    });
  });

  describe('parses JSON response', () => {
    it('should parse valid JSON response into EmailClassification[]', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test filter',
        emails: [
          {
            id: 'email-1',
            subject: 'Test',
            sender: { email: 'test@example.com' },
            snippet: 'Test content',
          },
        ],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                emailId: 'email-1',
                matches: true,
                confidence: 0.85,
                reasoning: 'Matches filter criteria',
              },
            ]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.classifyEmails(request);

      expect(result).toEqual([
        {
          emailId: 'email-1',
          matches: true,
          confidence: 0.85,
          reasoning: 'Matches filter criteria',
        },
      ]);
    });

    it('should handle multiple classifications in response', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [
          { id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' },
          { id: 'e2', subject: 'S2', sender: { email: 'b@test.com' }, snippet: 'C2' },
          { id: 'e3', subject: 'S3', sender: { email: 'c@test.com' }, snippet: 'C3' },
        ],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { emailId: 'e1', matches: true, confidence: 0.9 },
              { emailId: 'e2', matches: false, confidence: 0.3 },
              { emailId: 'e3', matches: true, confidence: 0.7 },
            ]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.classifyEmails(request);

      expect(result).toHaveLength(3);
      expect(result[0].emailId).toBe('e1');
      expect(result[1].emailId).toBe('e2');
      expect(result[2].emailId).toBe('e3');
    });

    it('should preserve optional reasoning field', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                emailId: 'e1',
                matches: true,
                confidence: 0.8,
                reasoning: 'Subject contains keyword',
              },
            ]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.classifyEmails(request);

      expect(result[0].reasoning).toBe('Subject contains keyword');
    });
  });

  describe('handles malformed response', () => {
    it('should throw AiProviderError for invalid JSON', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON {invalid}',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
      await expect(provider.classifyEmails(request)).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });

    it('should throw AiProviderError for empty response', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
    });

    it('should throw AiProviderError for non-array JSON response', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'something went wrong' }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
      await expect(provider.classifyEmails(request)).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });

    it('should throw AiProviderError for missing required fields in classification', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                emailId: 'e1',
                // missing 'matches' and 'confidence'
              },
            ]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
      await expect(provider.classifyEmails(request)).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    });
  });

  describe('handles API error', () => {
    it('should throw AiProviderError when API call fails', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const apiError = new Error('API request failed');
      mockCreate.mockRejectedValue(apiError);

      await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
      await expect(provider.classifyEmails(request)).rejects.toMatchObject({
        code: 'API_ERROR',
      });
    });

    it('should wrap API error with cause', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const apiError = new Error('Network timeout');
      mockCreate.mockRejectedValue(apiError);

      try {
        await provider.classifyEmails(request);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AiProviderError);
        expect((error as AiProviderError).cause).toBe(apiError);
      }
    });

    it('should handle rate limit errors', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      mockCreate.mockRejectedValue(rateLimitError);

      await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
    });

    it('should handle authentication errors', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      mockCreate.mockRejectedValue(authError);

      await expect(provider.classifyEmails(request)).rejects.toThrow(AiProviderError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty email list', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.classifyEmails(request);

      expect(result).toEqual([]);
    });

    it('should handle confidence values at boundaries', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [
          { id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' },
          { id: 'e2', subject: 'S2', sender: { email: 'b@test.com' }, snippet: 'C2' },
          { id: 'e3', subject: 'S3', sender: { email: 'c@test.com' }, snippet: 'C3' },
        ],
      };

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              { emailId: 'e1', matches: true, confidence: 0.0 },
              { emailId: 'e2', matches: true, confidence: 0.5 },
              { emailId: 'e3', matches: true, confidence: 1.0 },
            ]),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.classifyEmails(request);

      expect(result[0].confidence).toBe(0.0);
      expect(result[1].confidence).toBe(0.5);
      expect(result[2].confidence).toBe(1.0);
    });
  });
});
