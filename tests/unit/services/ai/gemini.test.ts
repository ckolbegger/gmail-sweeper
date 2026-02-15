import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../../../../src/services/ai/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn()
  };
});

describe('GeminiProvider', () => {
  const mockConfig = {
    provider: 'gemini' as const,
    model: 'gemini-pro',
    apiKey: 'test-api-key',
  };

  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should classify emails successfully', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          results: [
            {
              emailId: '1',
              matches: true,
              confidence: 0.9,
              reasoning: 'Matches description'
            }
          ]
        })
      }
    });

    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent
    });

    vi.mocked(GoogleGenerativeAI).mockImplementation(function() {
      return {
        getGenerativeModel: mockGetGenerativeModel
      } as any;
    });

    provider = new GeminiProvider(mockConfig);

    const request = {
      filterDescription: 'test filter',
      emails: [
        {
          id: '1',
          subject: 'Test subject',
          senderName: 'Sender',
          senderEmail: 'sender@example.com',
          snippet: 'Test snippet'
        }
      ]
    };

    const response = await provider.classifyEmails(request);

    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toEqual({
      emailId: '1',
      matches: true,
      confidence: 0.9,
      reasoning: 'Matches description'
    });
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro' });
  });

  it('should handle API errors', async () => {
    const mockGenerateContent = vi.fn().mockRejectedValue(new Error('API Error'));
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent
    });

    vi.mocked(GoogleGenerativeAI).mockImplementation(function() {
      return {
        getGenerativeModel: mockGetGenerativeModel
      } as any;
    });

    provider = new GeminiProvider(mockConfig);

    const request = {
      filterDescription: 'test filter',
      emails: []
    };

    await expect(provider.classifyEmails(request)).rejects.toThrow('API Error');
  });

  it('should handle invalid JSON from AI', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => 'invalid json'
      }
    });

    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent
    });

    vi.mocked(GoogleGenerativeAI).mockImplementation(function() {
      return {
        getGenerativeModel: mockGetGenerativeModel
      } as any;
    });

    provider = new GeminiProvider(mockConfig);

    const request = {
      filterDescription: 'test filter',
      emails: []
    };

    await expect(provider.classifyEmails(request)).rejects.toThrow('Failed to parse AI response as JSON');
  });
});
