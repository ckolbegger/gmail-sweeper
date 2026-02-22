/**
 * T021: Unit tests for useSmartFilter hook.
 * Tests: initial state is idle, activateFilter sets input mode,
 * submitFilter triggers evaluation with loading state, successful
 * evaluation updates filtered results, error preserves unfiltered view,
 * clearFilter restores idle state, missing config shows error message (FR-017).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Email, EmailAddress, Label } from '../../../src/core/models/index.js';

vi.mock('../../../src/core/ai/config.js', () => ({
  resolveAiConfig: vi.fn(),
}));

vi.mock('../../../src/core/ai/provider.js', () => ({
  createAiProvider: vi.fn(),
}));

function createTestEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email ${id}`,
    sender: { email: `sender${id}@example.com`, name: `Sender ${id}` } as EmailAddress,
    recipients: [{ email: 'recipient@example.com' }],
    date: new Date(),
    snippet: `Snippet ${id}`,
    labels: [] as Label[],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

describe('useSmartFilter', () => {
  let testEmails: Email[];
  let resolveAiConfig: typeof import('../../../src/core/ai/config.js').resolveAiConfig;
  let createAiProvider: typeof import('../../../src/core/ai/provider.js').createAiProvider;

  beforeEach(async () => {
    vi.clearAllMocks();

    testEmails = [
      createTestEmail('1'),
      createTestEmail('2'),
      createTestEmail('3'),
      createTestEmail('4'),
      createTestEmail('5'),
    ];

    const config = await import('../../../src/core/ai/config.js');
    resolveAiConfig = config.resolveAiConfig;

    const provider = await import('../../../src/core/ai/provider.js');
    createAiProvider = provider.createAiProvider;
  });

  describe('T021: State transitions', () => {
    it('should have initial state as idle', async () => {
      vi.mocked(resolveAiConfig).mockReturnValue(null);

      const { useSmartFilter } = await import('../../../src/tui/hooks/useSmartFilter');
      const { result } = renderHook(() => useSmartFilter());

      expect(result.current.filterState).toBe('idle');
      expect(result.current.filterDescription).toBe('');
      expect(result.current.filteredEmails).toEqual([]);
      expect(result.current.filterError).toBeNull();
    });

    it('should activate filter and set input mode', async () => {
      vi.mocked(resolveAiConfig).mockReturnValue(null);

      const { useSmartFilter } = await import('../../../src/tui/hooks/useSmartFilter');
      const { result } = renderHook(() => useSmartFilter());

      act(() => {
        result.current.activateFilter();
      });

      expect(result.current.filterState).toBe('input');
    });

    it('should trigger evaluation with loading state when submitting filter', async () => {
      const mockConfig = {
        provider: 'anthropic' as const,
        model: 'claude-3',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      };
      vi.mocked(resolveAiConfig).mockReturnValue(mockConfig);
      vi.mocked(createAiProvider).mockReturnValue({
        classifyEmails: vi.fn().mockImplementation(() => new Promise(() => {})),
      } as any);

      const { useSmartFilter } = await import('../../../src/tui/hooks/useSmartFilter');
      const { result } = renderHook(() => useSmartFilter());

      act(() => {
        result.current.activateFilter();
      });

      act(() => {
        result.current.submitFilter('test filter', testEmails);
      });

      expect(result.current.filterState).toBe('loading');
    });

    it('should update filtered results after successful evaluation', async () => {
      const mockConfig = {
        provider: 'anthropic' as const,
        model: 'claude-3',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      };
      vi.mocked(resolveAiConfig).mockReturnValue(mockConfig);
      vi.mocked(createAiProvider).mockReturnValue({
        classifyEmails: vi.fn().mockResolvedValue([
          { emailId: '1', matches: true, confidence: 0.9, confidenceLevel: 'high' },
          { emailId: '3', matches: true, confidence: 0.7, confidenceLevel: 'medium' },
        ]),
      } as any);

      const { useSmartFilter } = await import('../../../src/tui/hooks/useSmartFilter');
      const { result } = renderHook(() => useSmartFilter());

      await act(async () => {
        await result.current.submitFilter('test filter', testEmails);
      });

      expect(result.current.filterState).toBe('filtered');
      expect(result.current.filteredEmails.length).toBe(2);
    });

    it('should preserve unfiltered view on error', async () => {
      const mockConfig = {
        provider: 'anthropic' as const,
        model: 'claude-3',
        apiKey: 'test-key',
        maxContextTokens: 32000,
      };
      vi.mocked(resolveAiConfig).mockReturnValue(mockConfig);
      vi.mocked(createAiProvider).mockReturnValue({
        classifyEmails: vi.fn().mockRejectedValue(new Error('API Error')),
      } as any);

      const { useSmartFilter } = await import('../../../src/tui/hooks/useSmartFilter');
      const { result } = renderHook(() => useSmartFilter());

      await act(async () => {
        await result.current.submitFilter('test filter', testEmails);
      });

      expect(result.current.filterState).toBe('error');
      expect(result.current.filterError).toBe('API Error');
      expect(result.current.filteredEmails).toEqual([]);
    });

    it('should restore idle state when clearing filter', async () => {
      vi.mocked(resolveAiConfig).mockReturnValue(null);

      const { useSmartFilter } = await import('../../../src/tui/hooks/useSmartFilter');
      const { result } = renderHook(() => useSmartFilter());

      act(() => {
        result.current.activateFilter();
      });

      expect(result.current.filterState).toBe('input');

      act(() => {
        result.current.clearFilter();
      });

      expect(result.current.filterState).toBe('idle');
      expect(result.current.filterDescription).toBe('');
      expect(result.current.filteredEmails).toEqual([]);
    });

    it('should show error message when config is missing (FR-017)', async () => {
      vi.mocked(resolveAiConfig).mockReturnValue(null);

      const { useSmartFilter } = await import('../../../src/tui/hooks/useSmartFilter');
      const { result } = renderHook(() => useSmartFilter());

      await act(async () => {
        await result.current.submitFilter('test filter', testEmails);
      });

      expect(result.current.filterState).toBe('error');
      expect(result.current.filterError).toContain('AI configuration');
    });
  });
});
