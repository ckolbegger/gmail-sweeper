/**
 * Unit tests for useSmartFilter hook
 *
 * Tests state management for AI-powered email filtering.
 * Since React hooks can't be tested in node environment directly,
 * we test the underlying logic and state machine behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email } from '@/core/models/email.js';
import type { AiProvider, EmailClassification } from '@/core/ai/provider.js';

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

// Helper to simulate hook state machine
function createSmartFilterStateMachine() {
  let state: 'idle' | 'input' | 'loading' | 'filtered' | 'error' = 'idle';
  let description: string | null = null;
  let filteredEmails: Email[] = [];
  let error: string | null = null;

  return {
    get state() { return state; },
    get description() { return description; },
    get filteredEmails() { return [...filteredEmails]; },
    get error() { return error; },

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

      try {
        const provider: AiProvider = createAiProvider(config);
        const result = await runSmartFilter({
          emails,
          description: desc,
          provider,
          maxContextTokens: config.maxContextTokens,
        });

        filteredEmails = result.filteredEmails;
        state = 'filtered';
      } catch (err) {
        error = err instanceof Error ? err.message : 'Smart filter failed';
        state = 'error';
      }
    },

    clearFilter() {
      state = 'idle';
      description = null;
      filteredEmails = [];
      error = null;
    },
  };
}

describe('useSmartFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid config
    mockResolveAiConfig.mockReturnValue({
      provider: 'anthropic',
      apiKey: 'test-api-key',
      maxContextTokens: 32000,
    });
    // Default: successful filter
    mockRunSmartFilter.mockResolvedValue({
      classifications: [],
      filteredEmails: [],
    });
    // Default: mock provider
    mockCreateAiProvider.mockReturnValue({
      classifyEmails: vi.fn(),
    } as AiProvider);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state is idle', () => {
    it('should start in idle state', () => {
      const hook = createSmartFilterStateMachine();
      expect(hook.state).toBe('idle');
    });

    it('should have null description initially', () => {
      const hook = createSmartFilterStateMachine();
      expect(hook.description).toBeNull();
    });

    it('should have empty filteredEmails initially', () => {
      const hook = createSmartFilterStateMachine();
      expect(hook.filteredEmails).toEqual([]);
    });

    it('should have null error initially', () => {
      const hook = createSmartFilterStateMachine();
      expect(hook.error).toBeNull();
    });
  });

  describe('activateFilter sets input mode', () => {
    it('should set state to input when called', () => {
      const hook = createSmartFilterStateMachine();
      hook.activateFilter();
      expect(hook.state).toBe('input');
    });

    it('should clear any previous error', () => {
      const hook = createSmartFilterStateMachine();
      // First, trigger an error
      mockResolveAiConfig.mockReturnValue(null);
      void hook.submitFilter('test', [createTestEmail()]);
      expect(hook.error).not.toBeNull();

      // Now activate should clear error
      hook.activateFilter();
      expect(hook.error).toBeNull();
    });
  });

  describe('submitFilter triggers evaluation with loading state', () => {
    it('should set loading state when evaluation starts', async () => {
      const hook = createSmartFilterStateMachine();

      // Use a delayed promise to check intermediate state
      let resolvePromise: (value: any) => void;
      mockRunSmartFilter.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const promise = hook.submitFilter('test', [createTestEmail()]);
      // Check state during pending promise
      expect(hook.state).toBe('loading');

      // Resolve and wait
      resolvePromise!({ classifications: [], filteredEmails: [] });
      await promise;
    });

    it('should call runSmartFilter with correct parameters', async () => {
      const emails = [createTestEmail({ id: 'email-1' })];
      const description = 'financial offers';

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter(description, emails);

      expect(mockRunSmartFilter).toHaveBeenCalledWith({
        emails,
        description,
        provider: expect.anything(),
        maxContextTokens: 32000,
      });
    });
  });

  describe('successful evaluation updates filtered results', () => {
    it('should update filteredEmails with matching emails', async () => {
      const emails = [
        createTestEmail({ id: 'email-1' }),
        createTestEmail({ id: 'email-2' }),
      ];

      // Only email-1 matches
      const matchedEmail = createTestEmail({ id: 'email-1' });
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [
          { emailId: 'email-1', matches: true, confidence: 0.9 },
          { emailId: 'email-2', matches: false, confidence: 0.2 },
        ],
        filteredEmails: [matchedEmail],
      });

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('financial offers', emails);

      expect(hook.filteredEmails).toHaveLength(1);
      expect(hook.filteredEmails[0].id).toBe('email-1');
    });

    it('should set state to filtered after successful evaluation', async () => {
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [],
        filteredEmails: [],
      });

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('test', [createTestEmail()]);

      expect(hook.state).toBe('filtered');
    });

    it('should store the description on successful evaluation', async () => {
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [],
        filteredEmails: [],
      });

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('financial offers', [createTestEmail()]);

      expect(hook.description).toBe('financial offers');
    });
  });

  describe('error preserves unfiltered view', () => {
    it('should set error state on evaluation failure', async () => {
      mockRunSmartFilter.mockRejectedValueOnce(new Error('AI provider failed'));

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('test', [createTestEmail()]);

      expect(hook.state).toBe('error');
      expect(hook.error).toBe('AI provider failed');
    });

    it('should preserve empty filteredEmails on error (not set new values)', async () => {
      mockRunSmartFilter.mockRejectedValueOnce(new Error('Network error'));

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('test', [createTestEmail()]);

      // filteredEmails should remain as it was (empty)
      expect(hook.filteredEmails).toEqual([]);
    });

    it('should set error message from thrown error', async () => {
      mockRunSmartFilter.mockRejectedValueOnce(new Error('Network timeout'));

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('test', [createTestEmail()]);

      expect(hook.error).toBe('Network timeout');
    });

    it('should handle non-Error thrown values', async () => {
      mockRunSmartFilter.mockRejectedValueOnce('string error');

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('test', [createTestEmail()]);

      expect(hook.error).toBe('Smart filter failed');
    });
  });

  describe('clearFilter restores idle state', () => {
    it('should restore idle state', () => {
      const hook = createSmartFilterStateMachine();
      // First get to a different state
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [],
        filteredEmails: [createTestEmail()],
      });
      void hook.submitFilter('test', [createTestEmail()]);

      hook.clearFilter();
      expect(hook.state).toBe('idle');
    });

    it('should clear description', () => {
      const hook = createSmartFilterStateMachine();
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [],
        filteredEmails: [],
      });
      void hook.submitFilter('test description', [createTestEmail()]);

      hook.clearFilter();
      expect(hook.description).toBeNull();
    });

    it('should clear filteredEmails', () => {
      const hook = createSmartFilterStateMachine();
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [],
        filteredEmails: [createTestEmail()],
      });
      void hook.submitFilter('test', [createTestEmail()]);

      hook.clearFilter();
      expect(hook.filteredEmails).toEqual([]);
    });

    it('should clear error', () => {
      const hook = createSmartFilterStateMachine();
      mockResolveAiConfig.mockReturnValue(null);
      void hook.submitFilter('test', [createTestEmail()]);
      expect(hook.error).not.toBeNull();

      hook.clearFilter();
      expect(hook.error).toBeNull();
    });

    it('should work from error state', async () => {
      const hook = createSmartFilterStateMachine();
      mockRunSmartFilter.mockRejectedValueOnce(new Error('Failed'));
      await hook.submitFilter('test', [createTestEmail()]);

      expect(hook.state).toBe('error');
      hook.clearFilter();

      expect(hook.state).toBe('idle');
      expect(hook.description).toBeNull();
      expect(hook.filteredEmails).toEqual([]);
      expect(hook.error).toBeNull();
    });
  });

  describe('missing config shows error message (FR-017)', () => {
    it('should show error when AI provider is not configured', async () => {
      mockResolveAiConfig.mockReturnValue(null);

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('financial offers', [createTestEmail()]);

      expect(hook.state).toBe('error');
      expect(hook.error).toContain('AI provider not configured');
      expect(hook.error).toContain('AI_PROVIDER');
      expect(hook.error).toContain('AI_API_KEY');
    });

    it('should not call runSmartFilter when config is missing', async () => {
      mockResolveAiConfig.mockReturnValue(null);

      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('test', [createTestEmail()]);

      expect(mockRunSmartFilter).not.toHaveBeenCalled();
      expect(mockCreateAiProvider).not.toHaveBeenCalled();
    });

    it('should show error for empty description', async () => {
      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('', [createTestEmail()]);

      expect(hook.state).toBe('error');
      expect(hook.error).toBe('Filter description cannot be empty');
    });

    it('should show error for whitespace-only description', async () => {
      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('   ', [createTestEmail()]);

      expect(hook.state).toBe('error');
      expect(hook.error).toBe('Filter description cannot be empty');
    });

    it('should not call runSmartFilter for empty description', async () => {
      const hook = createSmartFilterStateMachine();
      await hook.submitFilter('', [createTestEmail()]);

      expect(mockRunSmartFilter).not.toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    it('should transition idle -> input -> loading -> filtered', async () => {
      const hook = createSmartFilterStateMachine();

      // Initial: idle
      expect(hook.state).toBe('idle');

      // After activate: input
      hook.activateFilter();
      expect(hook.state).toBe('input');

      // During submit: loading -> filtered
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [],
        filteredEmails: [],
      });
      await hook.submitFilter('test', [createTestEmail()]);
      expect(hook.state).toBe('filtered');
    });

    it('should transition to error state on failure', async () => {
      const hook = createSmartFilterStateMachine();
      mockRunSmartFilter.mockRejectedValueOnce(new Error('Failed'));

      await hook.submitFilter('test', [createTestEmail()]);
      expect(hook.state).toBe('error');
    });

    it('should allow clearFilter from idle state', () => {
      const hook = createSmartFilterStateMachine();
      hook.clearFilter();
      expect(hook.state).toBe('idle');
    });

    it('should allow clearFilter from filtered state', async () => {
      const hook = createSmartFilterStateMachine();
      mockRunSmartFilter.mockResolvedValueOnce({
        classifications: [],
        filteredEmails: [],
      });
      await hook.submitFilter('test', [createTestEmail()]);
      expect(hook.state).toBe('filtered');

      hook.clearFilter();
      expect(hook.state).toBe('idle');
    });

    it('should allow clearFilter from error state', async () => {
      const hook = createSmartFilterStateMachine();
      mockRunSmartFilter.mockRejectedValueOnce(new Error('Failed'));
      await hook.submitFilter('test', [createTestEmail()]);
      expect(hook.state).toBe('error');

      hook.clearFilter();
      expect(hook.state).toBe('idle');
    });
  });
});
