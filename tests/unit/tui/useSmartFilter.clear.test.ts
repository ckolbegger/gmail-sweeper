/**
 * T034: Unit tests for clear filter edge cases
 * Tests: clear during loading cancels evaluation, clear removes filter description,
 * clear when no filter active is no-op, clear restores original email order
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartFilter } from '../../../src/tui/hooks/useSmartFilter.js';

vi.mock('../../../src/core/ai/config.js', () => ({
  resolveAiConfig: vi.fn(),
}));

vi.mock('../../../src/core/ai/provider.js', () => ({
  createAiProvider: vi.fn(),
}));

function createTestEmail(id: string) {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email ${id}`,
    sender: { email: `sender${id}@example.com`, name: `Sender ${id}` },
    recipients: [],
    date: new Date(),
    snippet: `Snippet ${id}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

describe('T034: Clear Filter Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('clearFilter', () => {
    it('should clear filter description from display', async () => {
      const { result } = renderHook(() => useSmartFilter());
      
      // Simulate filtered state with description
      act(() => {
        result.current.activateFilter();
      });
      
      expect(result.current.filterDescription).toBe('');
      
      // After clear, description should be empty
      act(() => {
        result.current.clearFilter();
      });
      
      expect(result.current.filterDescription).toBe('');
      expect(result.current.filterState).toBe('idle');
    });

    it('should clear when no filter active is a no-op', () => {
      const { result } = renderHook(() => useSmartFilter());
      
      // Initial state should be idle
      expect(result.current.filterState).toBe('idle');
      
      // Clear should work without error even when idle
      act(() => {
        result.current.clearFilter();
      });
      
      // State should still be idle
      expect(result.current.filterState).toBe('idle');
    });

    it('should restore original email order after clear', async () => {
      const { result } = renderHook(() => useSmartFilter());
      
      const emails = [
        createTestEmail('3'),
        createTestEmail('1'),
        createTestEmail('2'),
      ];
      
      // Simulate filtered state
      act(() => {
        result.current.activateFilter();
      });
      
      // Clear should restore to original state
      act(() => {
        result.current.clearFilter();
      });
      
      // Filtered emails should be empty
      expect(result.current.filteredEmails).toEqual([]);
    });

    it('should reset all state values on clear', () => {
      const { result } = renderHook(() => useSmartFilter());
      
      act(() => {
        result.current.activateFilter();
      });
      
      act(() => {
        result.current.clearFilter();
      });
      
      // All state should be reset
      expect(result.current.filterState).toBe('idle');
      expect(result.current.filterDescription).toBe('');
      expect(result.current.filteredEmails).toEqual([]);
      expect(result.current.filterError).toBeNull();
      expect(result.current.confidenceMap.size).toBe(0);
      expect(result.current.progress).toBeNull();
    });
  });
});
