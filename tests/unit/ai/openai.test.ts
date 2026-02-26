/**
 * T026: Unit tests for OpenAiProvider.classifyEmails()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmailMetadata, EmailClassification } from '../../../src/core/ai/provider.js';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn() } },
  })),
}));

describe('OpenAiProvider', () => {
  let OpenAiProvider: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import('../../../src/core/ai/openai.js');
    OpenAiProvider = mod.OpenAiProvider;
  });

  const mockEmails: EmailMetadata[] = [
    { id: 'email-1', subject: 'Meeting request', sender: 'alice@example.com', snippet: 'Can we meet?' },
  ];

  describe('baseUrl config', () => {
    it('should use baseUrl from config when provided', async () => {
      const mod = await import('openai');
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: '[]' } }]
      });
      mod.default.mockImplementation(() => ({ chat: { completions: { create: mockCreate } } }));

      new OpenAiProvider({
        model: 'gpt-4o',
        apiKey: 'test-key',
        maxContextTokens: 32000,
        baseUrl: 'https://custom.openai.example.com/v1',
      });

      expect(mod.default).toHaveBeenCalledWith({
        apiKey: 'test-key',
        baseURL: 'https://custom.openai.example.com/v1',
      });
    });

    it('should not include baseUrl when not provided', async () => {
      const mod = await import('openai');
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: '[]' } }]
      });
      mod.default.mockImplementation(() => ({ chat: { completions: { create: mockCreate } } }));

      new OpenAiProvider({
        model: 'gpt-4o',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      });

      expect(mod.default).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });
  });
});
