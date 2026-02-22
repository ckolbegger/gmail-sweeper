/**
 * T025: Unit tests for AnthropicProvider.classifyEmails()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmailMetadata, EmailClassification } from '../../../src/core/ai/provider.js';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

describe('AnthropicProvider', () => {
  let AnthropicProvider: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import('../../../src/core/ai/anthropic.js');
    AnthropicProvider = mod.AnthropicProvider;
  });

  const mockEmails: EmailMetadata[] = [
    { id: 'email-1', subject: 'Meeting request', sender: 'alice@example.com', snippet: 'Can we meet?' },
  ];

  describe('baseUrl config', () => {
    it('should use baseUrl from config when provided', async () => {
      const mod = await import('@anthropic-ai/sdk');
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '[]' }]
      });
      mod.default.mockImplementation(() => ({ messages: { create: mockCreate } }));

      new AnthropicProvider({
        model: 'test-model',
        apiKey: 'test-key',
        maxContextTokens: 32000,
        baseUrl: 'https://custom.anthropic.example.com',
      });

      expect(mod.default).toHaveBeenCalledWith({
        apiKey: 'test-key',
        baseURL: 'https://custom.anthropic.example.com',
      });
    });

    it('should not include baseUrl when not provided', async () => {
      const mod = await import('@anthropic-ai/sdk');
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '[]' }]
      });
      mod.default.mockImplementation(() => ({ messages: { create: mockCreate } }));

      new AnthropicProvider({
        model: 'test-model',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      });

      expect(mod.default).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });
  });
});
