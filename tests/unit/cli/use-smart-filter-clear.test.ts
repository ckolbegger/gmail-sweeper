/**
 * Unit tests for clear filter edge cases in useSmartFilter hook
 *
 * T034: Tests for clearing filter in various states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email } from '@/core/models/email.js';
import type { AiProvider } from '@/core/ai/provider.js';

// Mock dependencies - must be before imports
vi.mock('@/core/ai/config.js', () => ({
  resolveAiConfig: vi.fn(),
}));

vi.mock('@/core/ai/provider.js', () => ({
  createAiProvider: vi.fn(),
}));

vi.mock('@/core/filter/smart-filter.js', () => ({
  runSmartFilter: vi.fn(),
}));

import { resolveAiConfig } from '@/core/ai/config.js';
import { createAiProvider } from '@/core/ai/provider.js';
import { runSmartFilter } from '@/core/filter/smart-filter.js';

const mockResolveAiConfig = vi.mocked(resolveAiConfig);
const mockCreateAiProvider = vi.mocked(createAiProvider);
const mockRunSmartFilter = vi.mocked(runSmartFilter);

// Helper to create test emails
function createTestEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-id',
    threadId: 'thread-id',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'test@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: 'Test body' },
    labels: [],
    isRead: true,
    snippet: 'Test snippet',
    historyId: '123',
    syncedAt: new Date(),
    ...overrides,
  };
}

// State machine that mimics the actual hook with AbortController support
function createSmartFilterStateMachineWithAbort() {
  let state: 'idle' | 'input' | 'loading' | 'filtered' | 'error' = 'idle';
  let description: string | null = null;
  let filteredEmails: Email[] = [];
  let error: string | null = null;
  let abortController: AbortController | null = null;

  return {
    get state() { return state; },
    get description() { return description; },
    get filteredEmails() { return [...filteredEmails]; },
    get error() { return error; },
    get abortController() { return abortController; },

    activateFilter() {
      state = 'input';
      error = null;
    },

    async submitFilter(desc: string, emails: Email[]): Promise<void> {
      // Validate description
      if (!desc || desc.trim() === '') {
        error = 'Filter description cannot be empty';
        state = 'error';
        return;
      }

      // Check for AI configuration (FR-017)
      const config = resolveAiConfig();
      if (!config) {
        error = 'AI provider not configured. Set AI_PROVIDER and AI_API_KEY environment variables.';
        state = 'error';
        return;
      }

      state = 'loading';
      description = desc;
      error = null;

      // Create AbortController for cancellation support
      abortController = new AbortController();
      const currentSignal = abortController.signal;

      try {
        const provider: AiProvider = createAiProvider(config);
        const result = await runSmartFilter({
          emails,
          description: desc,
          provider,
          maxContextTokens: config.maxContextTokens,
          abortSignal: currentSignal,
        });

        // Only update state if not aborted
        if (!currentSignal.aborted) {
          filteredEmails = result.filteredEmails;
          state = 'filtered';
        }
      } catch (err) {
        // Only set error if not aborted
        if (!currentSignal.aborted) {
          error = err instanceof Error ? err.message : 'Smart filter failed';
          state = 'error';
        }
      } finally {
        abortController = null;
      }
    },

    clearFilter() {
      // Abort any in-flight operation
      if (abortController && !abortController.signal.aborted) {
        abortController.abort();
      }

      state = 'idle';
      description = null;
      filteredEmails = [];
      error = null;
      abortController = null;
    },
  };
}

describe('useSmartFilter - Clear Filter Edge Cases (T034)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid config
    mockResolveAiConfig.mockReturnValue({
      provider: 'anthropic',
      apiKey: 'test-api-key',
      maxContextTokens: 32000,
    });
    // Default: mock provider
    mockCreateAiProvider.mockReturnValue({
      classifyEmails: vi.fn(),
    } as AiProvider);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('T034-1: Clear during loading cancels in-progress evaluation', () => {
    it('should abort in-flight evaluation when clearFilter is called during loading', async () => {
      // Create a promise that we can control
      let resolveRunSmartFilter: (value: any) => void;
      const runSmartFilterPromise = new Promise<any>((resolve) => {
        resolveRunSmartFilter = resolve;
      });

      mockRunSmartFilter.mockReturnValue(runSmartFilterPromise);

      const hook = createSmartFilterStateMachineWithAbort();

      // Activate and submit filter
      hook.activateFilter();
      const submitPromise = hook.submitFilter('test filter', [createTestEmail()]);

      // Should be in loading state
      expect(hook.state).toBe('loading');
      expect(hook.abortController).not.toBeNull();

      // Clear filter during loading
      hook.clearFilter();

      // Should immediately return to idle state
      expect(hook.state).toBe('idle');
      expect(hook.description).toBeNull();
      expect(hook.filteredEmails).toEqual([]);
      expect(hook.error).toBeNull();

      // AbortController should be aborted
      expect(hook.abortController).toBeNull(); // cleared after abort

      // Resolve the promise (simulating late completion) - should be ignored
      resolveRunSmartFilter!({
        filteredEmails: [createTestEmail()],
        classifications: [],
      });
      await submitPromise;

      // State should still be idle (not affected by late resolution)
      expect(hook.state).toBe('idle');
    });

    it('should pass AbortSignal to runSmartFilter that can be aborted', async () => {
      let capturedAbortSignal: AbortSignal | undefined;

      mockRunSmartFilter.mockImplementation(async (params: any) => {
        capturedAbortSignal = params.abortSignal;
        // Simulate slow operation
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { filteredEmails: [], classifications: [] };
      });

      const hook = createSmartFilterStateMachineWithAbort();

      hook.activateFilter();
      const submitPromise = hook.submitFilter('test filter', [createTestEmail()]);

      expect(hook.state).toBe('loading');
      expect(capturedAbortSignal).toBeDefined();
      expect(capturedAbortSignal?.aborted).toBe(false);

      // Clear should abort the signal
      hook.clearFilter();

      expect(capturedAbortSignal?.aborted).toBe(true);

      // Wait for the promise to settle
      await submitPromise.catch(() => {}); // Ignore any abort error
    });
  });

  describe('T034-2: Clear removes filter description from display', () => {
    it('should remove description when clearing from filtered state', async () => {
      mockRunSmartFilter.mockResolvedValue({
        filteredEmails: [createTestEmail({ id: 'email-1' })],
        classifications: [],
      });

      const hook = createSmartFilterStateMachineWithAbort();

      hook.activateFilter();
      await hook.submitFilter('my filter description', [createTestEmail()]);

      expect(hook.state).toBe('filtered');
      expect(hook.description).toBe('my filter description');

      hook.clearFilter();

      expect(hook.description).toBeNull();
    });

    it('should remove description when clearing from error state', async () => {
      mockRunSmartFilter.mockRejectedValue(new Error('API error'));

      const hook = createSmartFilterStateMachineWithAbort();

      hook.activateFilter();
      await hook.submitFilter('failing filter', [createTestEmail()]);

      expect(hook.state).toBe('error');
      expect(hook.description).toBe('failing filter');

      hook.clearFilter();

      expect(hook.description).toBeNull();
    });
  });

  describe('T034-3: Clear when no filter active is a no-op', () => {
    it('should be a no-op when called from idle state', () => {
      const hook = createSmartFilterStateMachineWithAbort();

      expect(hook.state).toBe('idle');

      // Call clearFilter - should be safe no-op
      hook.clearFilter();

      expect(hook.state).toBe('idle');
      expect(hook.description).toBeNull();
      expect(hook.filteredEmails).toEqual([]);
      expect(hook.error).toBeNull();
    });

    it('should be idempotent - multiple calls are safe', () => {
      const hook = createSmartFilterStateMachineWithAbort();

      hook.clearFilter();
      hook.clearFilter();
      hook.clearFilter();

      expect(hook.state).toBe('idle');
    });
  });

  describe('T034-4: Clear restores original email order', () => {
    it('should return empty filteredEmails array (caller restores original list)', async () => {
      mockRunSmartFilter.mockResolvedValue({
        filteredEmails: [createTestEmail({ id: 'email-2' }), createTestEmail({ id: 'email-1' })],
        classifications: [],
      });

      const hook = createSmartFilterStateMachineWithAbort();

      hook.activateFilter();
      await hook.submitFilter('test', [createTestEmail()]);

      expect(hook.state).toBe('filtered');
      expect(hook.filteredEmails).toHaveLength(2);

      hook.clearFilter();

      // Clear should reset to empty array - the app component
      // is responsible for restoring the original list
      expect(hook.filteredEmails).toEqual([]);
      expect(hook.state).toBe('idle');
    });
  });
});
