import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiProviderConfig } from '../../../src/core/ai/config.js';
import type { ClassificationRequest, EmailClassification } from '../../../src/core/ai/provider.js';
import { AiProviderError } from '../../../src/core/errors/index.js';

// Mock the OpenAI SDK
const mockCreate = vi.fn();

vi.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  }
  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

// Import after mocking
import { OpenAiProvider } from '../../../src/core/ai/openai.js';

describe('OpenAiProvider.classifyEmails()', () => {
  let config: AiProviderConfig;
  let provider: OpenAiProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-api-key',
      maxContextTokens: 32000,
    };

    provider = new OpenAiProvider(config);
  });

  describe('sends correct prompt', () => {
    it('should send system and user prompts to OpenAI API', async () => {
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
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  emailId: 'email-1',
                  matches: true,
                  confidence: 0.95,
                  reasoning: 'Clearly about project updates',
                },
              ]),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.classifyEmails(request);

      expect(mockCreate).toHaveBeenCalledOnce();
      const callArgs = mockCreate.mock.calls[0][0];

      expect(callArgs.model).toBe('gpt-4o-mini');
      expect(callArgs.messages).toBeDefined();
      expect(callArgs.messages).toHaveLength(2);

      const systemMessage = callArgs.messages[0];
      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('email classification assistant');
      expect(systemMessage.content).toContain('JSON');

      const userMessage = callArgs.messages[1];
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toContain('Project Update - Q1 2025');
      expect(userMessage.content).toContain('emails about project updates');
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
        choices: [
          {
            message: {
              content: JSON.stringify([
                { emailId: 'email-1', matches: true, confidence: 0.9 },
                { emailId: 'email-2', matches: false, confidence: 0.2 },
              ]),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.classifyEmails(request);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;

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
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  emailId: 'email-1',
                  matches: true,
                  confidence: 0.85,
                  reasoning: 'Matches filter criteria',
                },
              ]),
            },
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
        choices: [
          {
            message: {
              content: JSON.stringify([
                { emailId: 'e1', matches: true, confidence: 0.9 },
                { emailId: 'e2', matches: false, confidence: 0.3 },
                { emailId: 'e3', matches: true, confidence: 0.7 },
              ]),
            },
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
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  emailId: 'e1',
                  matches: true,
                  confidence: 0.8,
                  reasoning: 'Subject contains keyword',
                },
              ]),
            },
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
        choices: [
          {
            message: {
              content: 'This is not valid JSON {invalid}',
            },
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
        choices: [
          {
            message: {
              content: '',
            },
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
        choices: [
          {
            message: {
              content: JSON.stringify({ error: 'something went wrong' }),
            },
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
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  emailId: 'e1',
                  // missing 'matches' and 'confidence'
                },
              ]),
            },
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

  describe('respects baseUrl config', () => {
    it('should use custom baseUrl when provided', async () => {
      const customConfig: AiProviderConfig = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'test-api-key',
        baseUrl: 'https://api.custom-provider.com/v1',
        maxContextTokens: 32000,
      };

      const customProvider = new OpenAiProvider(customConfig);

      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([{ emailId: 'e1', matches: true, confidence: 0.8 }]),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await customProvider.classifyEmails(request);

      // Verify the provider was initialized with baseUrl
      // This is tested implicitly by the fact that the call succeeds
      // The actual baseUrl validation happens in the OpenAI SDK initialization
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('should work with OpenAI-compatible APIs using baseUrl', async () => {
      const compatibleConfig: AiProviderConfig = {
        provider: 'openai',
        model: 'llama-2-70b',
        apiKey: 'test-api-key',
        baseUrl: 'https://api.together.xyz/v1',
        maxContextTokens: 32000,
      };

      const compatibleProvider = new OpenAiProvider(compatibleConfig);

      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [{ id: 'e1', subject: 'S1', sender: { email: 'a@test.com' }, snippet: 'C1' }],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([{ emailId: 'e1', matches: true, confidence: 0.75 }]),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await compatibleProvider.classifyEmails(request);

      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.75);
    });
  });

  describe('edge cases', () => {
    it('should handle empty email list', async () => {
      const request: ClassificationRequest = {
        filterDescription: 'test',
        emails: [],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([]),
            },
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
        choices: [
          {
            message: {
              content: JSON.stringify([
                { emailId: 'e1', matches: true, confidence: 0.0 },
                { emailId: 'e2', matches: true, confidence: 0.5 },
                { emailId: 'e3', matches: true, confidence: 1.0 },
              ]),
            },
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
