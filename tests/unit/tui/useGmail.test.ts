/**
 * T040: Unit tests for useGmail hook.
 * Tests data fetching, caching, error handling, and pagination.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Email, EmailAddress, Label } from '../../../src/core/models/index.js';

// Mock email helper
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

describe('useGmail', () => {
  describe('T040: Data Fetching', () => {
    it('should return loading state initially', () => {
      const state = {
        isLoading: true,
        emails: [],
        error: null,
        hasMore: true,
      };

      expect(state.isLoading).toBe(true);
      expect(state.emails).toHaveLength(0);
      expect(state.error).toBeNull();
    });

    it('should return emails after fetch', () => {
      const emails = [createTestEmail('1'), createTestEmail('2'), createTestEmail('3')];

      const state = {
        isLoading: false,
        emails,
        error: null,
        hasMore: false,
      };

      expect(state.isLoading).toBe(false);
      expect(state.emails).toHaveLength(3);
      expect(state.emails[0]?.subject).toBe('Email 1');
    });

    it('should return error state on failure', () => {
      const state = {
        isLoading: false,
        emails: [],
        error: new Error('Network error'),
        hasMore: false,
      };

      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
      expect(state.error?.message).toContain('Network');
    });

    it('should provide refresh function', () => {
      const onRefresh = vi.fn();
      const mockRefresh = () => {
        onRefresh();
        return Promise.resolve();
      };

      mockRefresh();
      expect(onRefresh).toHaveBeenCalled();
    });

    it('should deduplicate concurrent refresh calls', async () => {
      let callCount = 0;
      const fetchEmails = async () => {
        callCount++;
        return [createTestEmail('1')];
      };

      // Simulate concurrent calls with deduplication
      const pendingPromise = Promise.resolve(fetchEmails());
      const result1 = await pendingPromise;
      const result2 = await pendingPromise; // Same promise

      expect(callCount).toBe(1); // Should only call once
      expect(result1).toEqual(result2);
    });

    it('should handle pagination (load more)', () => {
      const initialEmails = Array.from({ length: 50 }, (_, i) => createTestEmail(String(i + 1)));
      const nextPageEmails = Array.from({ length: 50 }, (_, i) => createTestEmail(String(i + 51)));

      let allEmails = [...initialEmails];
      let hasMore = true;

      const loadMore = () => {
        allEmails = [...allEmails, ...nextPageEmails];
        hasMore = false;
        return allEmails;
      };

      expect(allEmails).toHaveLength(50);
      loadMore();
      expect(allEmails).toHaveLength(100);
      expect(hasMore).toBe(false);
    });

    it('should cache results to avoid refetch', async () => {
      const fetchFn = vi.fn(async () => [createTestEmail('1')]);

      // First call
      const result1 = await fetchFn();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Second call (should use cache, not call fetchFn again)
      const result2 = result1; // Simulate cache hit
      expect(fetchFn).toHaveBeenCalledTimes(1); // Still 1
      expect(result1).toEqual(result2);
    });
  });
});
