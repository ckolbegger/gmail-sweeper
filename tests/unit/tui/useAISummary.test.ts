/**
 * R008: Unit tests for useAISummary hook.
 * Tests: initial state is idle, existing summary returns immediately,
 * no body content sets error, missing config sets error,
 * successful generation returns summary, generation error sets error,
 * abort handling resets state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Email, EmailAddress, Label, EmailSummary } from '../../../src/core/models/index.js';

vi.mock('../../../src/core/ai/config.js', () => ({
  resolveAiConfig: vi.fn(),
}));

vi.mock('../../../src/core/ai/provider.js', () => ({
  createAiProvider: vi.fn(),
}));

function createTestEmail(id: string, bodyText?: string, bodyHtml?: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email ${id}`,
    sender: { email: `sender${id}@example.com`, name: `Sender ${id}` } as EmailAddress,
    recipients: [{ email: 'recipient@example.com' }],
    date: new Date(),
    snippet: `Snippet ${id}`,
    bodyText,
    bodyHtml,
    labels: [] as Label[],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

describe('useAISummary', () => {
  let resolveAiConfig: typeof import('../../../src/core/ai/config.js').resolveAiConfig;
  let createAiProvider: typeof import('../../../src/core/ai/provider.js').createAiProvider;

  beforeEach(async () => {
    vi.clearAllMocks();

    const config = await import('../../../src/core/ai/config.js');
    resolveAiConfig = config.resolveAiConfig;

    const provider = await import('../../../src/core/ai/provider.js');
    createAiProvider = provider.createAiProvider;
  });

  describe('Initial state', () => {
    it('should have initial state as idle', async () => {
      vi.mocked(resolveAiConfig).mockReturnValue(null);

      const { useAISummary } = await import('../../../src/tui/hooks/useAISummary');
      const { result } = renderHook(() => useAISummary());

      expect(result.current.summaryState).toBe('idle');
      expect(result.current.summaryError).toBeNull();
    });
  });

  describe('Existing summary', () => {
    it('should return existing summary without calling LLM', async () => {
      const existingSummary: EmailSummary = {
        summary: 'Existing summary',
        generatedAt: new Date(),
      };
      const email = createTestEmail('1', 'body text');
      email.summary = existingSummary;

      const { useAISummary } = await import('../../../src/tui/hooks/useAISummary');
      const { result } = renderHook(() => useAISummary());

      let returnValue: EmailSummary | null = null;
      await act(async () => {
        returnValue = await result.current.generateSummary(email);
      });

      expect(returnValue).toEqual(existingSummary);
      expect(createAiProvider).not.toHaveBeenCalled();
    });
  });

  describe('No body content', () => {
    it('should set error state when email has no body', async () => {
      const email = createTestEmail('1');

      const { useAISummary } = await import('../../../src/tui/hooks/useAISummary');
      const { result } = renderHook(() => useAISummary());

      await act(async () => {
        await result.current.generateSummary(email);
      });

      expect(result.current.summaryState).toBe('error');
      expect(result.current.summaryError).toBe('Email has no body content to summarize');
    });
  });

  describe('Missing config', () => {
    it('should set error state when AI config is not found', async () => {
      vi.mocked(resolveAiConfig).mockReturnValue(null);
      const email = createTestEmail('1', 'body text');

      const { useAISummary } = await import('../../../src/tui/hooks/useAISummary');
      const { result } = renderHook(() => useAISummary());

      await act(async () => {
        await result.current.generateSummary(email);
      });

      expect(result.current.summaryState).toBe('error');
      expect(result.current.summaryError).toBe(
        'AI configuration not found. Please check your environment variables.'
      );
    });
  });

  describe('Successful generation', () => {
    it('should return summary and set success state', async () => {
      const mockProvider = {
        classifyEmails: vi.fn(),
        generateSummary: vi.fn().mockResolvedValue({
          emailId: '1',
          summary: 'Test summary',
          actionItems: ['Action 1'],
          generatedAt: new Date(),
        }),
      } as unknown as import('../../../src/core/ai/provider.js').AiProvider;
      vi.mocked(resolveAiConfig).mockReturnValue({
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-5-20250929',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      });
      vi.mocked(createAiProvider).mockReturnValue(mockProvider);

      const email = createTestEmail('1', 'body text');
      const { useAISummary } = await import('../../../src/tui/hooks/useAISummary');
      const { result } = renderHook(() => useAISummary());

      let returnValue: EmailSummary | null = null;
      await act(async () => {
        returnValue = await result.current.generateSummary(email);
      });

      expect(result.current.summaryState).toBe('success');
      expect(returnValue).not.toBeNull();
      expect(returnValue!.summary).toBe('Test summary');
    });
  });

  describe('Generation error', () => {
    it('should set error state when generation fails', async () => {
      const mockProvider = {
        classifyEmails: vi.fn(),
        generateSummary: vi.fn().mockRejectedValue(new Error('API error')),
      };
      vi.mocked(resolveAiConfig).mockReturnValue({
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-5-20250929',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      });
      vi.mocked(createAiProvider).mockReturnValue(mockProvider as any);

      const email = createTestEmail('1', 'body text');
      const { useAISummary } = await import('../../../src/tui/hooks/useAISummary');
      const { result } = renderHook(() => useAISummary());

      await act(async () => {
        await result.current.generateSummary(email);
      });

      expect(result.current.summaryState).toBe('error');
      expect(result.current.summaryError).toBe('API error');
    });
  });

  describe('Abort handling', () => {
    it('should reset state when request is aborted', async () => {
      const mockProvider = {
        classifyEmails: vi.fn(),
        generateSummary: vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
      } as unknown as import('../../../src/core/ai/provider.js').AiProvider;
      vi.mocked(resolveAiConfig).mockReturnValue({
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-5-20250929',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      });
      vi.mocked(createAiProvider).mockReturnValue(mockProvider);

      const email = createTestEmail('1', 'body text');
      const { useAISummary } = await import('../../../src/tui/hooks/useAISummary');
      const { result } = renderHook(() => useAISummary());

      await act(async () => {
        await result.current.generateSummary(email);
      });

      expect(result.current.summaryState).toBe('idle');
    });
  });
});
