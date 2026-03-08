/**
 * T004: Unit tests for SummaryService.
 * AI provider is mocked — no real API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Email } from '../../../src/core/models/index.js';
import type { AiProviderConfig } from '../../../src/core/ai/provider.js';

// Mock Anthropic and OpenAI SDKs
const mockAnthropicCreate = vi.fn();
const mockOpenAiCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  })),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAiCreate } },
  })),
}));

// Import after mocks
import { SummaryService, SummaryGenerationError } from '../../../src/core/summary/service.js';

const ANTHROPIC_CONFIG: AiProviderConfig = {
  provider: 'anthropic',
  model: 'claude-3-haiku-20240307',
  apiKey: 'test-key',
};

const OPENAI_CONFIG: AiProviderConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'test-key',
};

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Meeting Tomorrow',
    sender: { email: 'alice@example.com', name: 'Alice' },
    recipients: [{ email: 'bob@example.com' }],
    date: new Date(),
    snippet: 'Let us meet tomorrow at 3pm.',
    bodyText: 'Hi Bob, can we meet tomorrow at 3pm to discuss the project?',
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
    ...overrides,
  };
}

const VALID_AI_RESPONSE = 'Alice is requesting a meeting tomorrow at 3pm.\n\n- Confirm meeting availability\n- Prepare project discussion points';

describe('SummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Anthropic provider', () => {
    it('calls AI with the email prompt', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: VALID_AI_RESPONSE }],
      });

      const service = new SummaryService(ANTHROPIC_CONFIG);
      await service.summarize(makeEmail());

      expect(mockAnthropicCreate).toHaveBeenCalledOnce();
      const call = mockAnthropicCreate.mock.calls[0]![0] as Record<string, unknown>;
      expect(typeof call.system).toBe('string');
      expect(Array.isArray(call.messages)).toBe(true);
    });

    it('returns a parsed EmailSummary', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: VALID_AI_RESPONSE }],
      });

      const service = new SummaryService(ANTHROPIC_CONFIG);
      const email = makeEmail({ id: 'email-42' });
      const result = await service.summarize(email);

      expect(result.emailId).toBe('email-42');
      expect(result.oneSentence).toBe('Alice is requesting a meeting tomorrow at 3pm.');
      expect(result.actionItems).toEqual([
        'Confirm meeting availability',
        'Prepare project discussion points',
      ]);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('passes email body to the prompt', async () => {
      mockAnthropicCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: VALID_AI_RESPONSE }],
      });

      const service = new SummaryService(ANTHROPIC_CONFIG);
      await service.summarize(makeEmail({ bodyText: 'Custom body content here.' }));

      const call = mockAnthropicCreate.mock.calls[0]![0] as Record<string, unknown>;
      const messages = call.messages as Array<{ role: string; content: string }>;
      expect(messages[0]!.content).toContain('Custom body content here.');
    });

    it('wraps AI errors in SummaryGenerationError', async () => {
      mockAnthropicCreate.mockRejectedValue(new Error('Network timeout'));

      const service = new SummaryService(ANTHROPIC_CONFIG);
      const rejection = service.summarize(makeEmail());
      await expect(rejection).rejects.toThrow(SummaryGenerationError);
      await expect(rejection).rejects.toThrow('Network timeout');
    });
  });

  describe('OpenAI provider', () => {
    it('calls OpenAI and returns parsed summary', async () => {
      mockOpenAiCreate.mockResolvedValueOnce({
        choices: [{ message: { content: VALID_AI_RESPONSE } }],
      });

      const service = new SummaryService(OPENAI_CONFIG);
      const result = await service.summarize(makeEmail({ id: 'email-oa' }));

      expect(mockOpenAiCreate).toHaveBeenCalledOnce();
      expect(result.emailId).toBe('email-oa');
      expect(result.oneSentence).toBeTruthy();
    });
  });

  describe('unsupported provider', () => {
    it('throws SummaryGenerationError for unknown provider', async () => {
      const badConfig = { ...ANTHROPIC_CONFIG, provider: 'gemini' as 'anthropic' };
      const service = new SummaryService(badConfig);

      await expect(service.summarize(makeEmail())).rejects.toBeInstanceOf(SummaryGenerationError);
      await expect(service.summarize(makeEmail())).rejects.toThrow('Unsupported AI provider');
    });
  });
});
