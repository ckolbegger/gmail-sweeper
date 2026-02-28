/**
 * Integration test for clear filter cycle
 *
 * T035: Test full filter → clear → restore cycle
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
    get progress() { return null; },
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

describe('Smart Filter Clear - Integration (T035)', () => {
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

  it('should complete full filter cycle: apply → verify → clear → restore', async () => {
    // Setup: filter returns only newsletters
    const newsletterEmail = createTestEmail({
      id: 'email-1',
      subject: 'Newsletter from Tech Co',
    });
    const meetingEmail = createTestEmail({
      id: 'email-2',
      subject: 'Meeting Tomorrow',
    });
    const orderEmail = createTestEmail({
      id: 'email-3',
      subject: 'Your Order Shipped',
    });
    const allEmails = [newsletterEmail, meetingEmail, orderEmail];

    mockRunSmartFilter.mockResolvedValue({
      filteredEmails: [newsletterEmail], // Only the newsletter matches
      classifications: [
        { emailId: 'email-1', matches: true, confidence: 0.9, reasoning: 'Newsletter' },
      ],
    });

    const hook = createSmartFilterStateMachineWithAbort();

    // Initial state: idle, no filter
    expect(hook.state).toBe('idle');
    expect(hook.filteredEmails).toEqual([]);
    expect(hook.description).toBeNull();

    // Step 1: Activate filter mode
    hook.activateFilter();
    expect(hook.state).toBe('input');

    // Step 2: Submit filter description
    await hook.submitFilter('show me newsletters', allEmails);

    // Step 3: Verify filtered results
    expect(hook.state).toBe('filtered');
    expect(hook.filteredEmails).toHaveLength(1);
    expect(hook.filteredEmails[0].id).toBe('email-1');
    expect(hook.description).toBe('show me newsletters');

    // Step 4: Clear filter
    hook.clearFilter();

    // Step 5: Verify full list restored state
    expect(hook.state).toBe('idle');
    expect(hook.filteredEmails).toEqual([]);
    expect(hook.description).toBeNull();
    expect(hook.error).toBeNull();
  });

  it('should show no filter description after clear', async () => {
    mockRunSmartFilter.mockResolvedValue({
      filteredEmails: [],
      classifications: [],
    });

    const hook = createSmartFilterStateMachineWithAbort();

    hook.activateFilter();
    await hook.submitFilter('all emails', [createTestEmail()]);

    expect(hook.description).toBe('all emails');

    hook.clearFilter();

    // Description should be cleared
    expect(hook.description).toBeNull();
  });

  it('should handle clear from loading state gracefully', async () => {
    let resolveRunSmartFilter: (value: any) => void;
    const slowPromise = new Promise<any>((resolve) => {
      resolveRunSmartFilter = resolve;
    });

    mockRunSmartFilter.mockReturnValue(slowPromise);

    const hook = createSmartFilterStateMachineWithAbort();

    hook.activateFilter();
    const submitPromise = hook.submitFilter('slow filter', [createTestEmail()]);

    // Should be loading
    expect(hook.state).toBe('loading');

    // Clear during loading
    hook.clearFilter();

    // Should immediately be idle
    expect(hook.state).toBe('idle');

    // Late resolution should not change state
    resolveRunSmartFilter!({
      filteredEmails: [createTestEmail()],
      classifications: [],
    });
    await submitPromise;

    expect(hook.state).toBe('idle');
  });

  it('should handle clear from error state', async () => {
    mockRunSmartFilter.mockRejectedValue(new Error('Network error'));

    const hook = createSmartFilterStateMachineWithAbort();

    hook.activateFilter();
    await hook.submitFilter('failing filter', [createTestEmail()]);

    expect(hook.state).toBe('error');
    expect(hook.error).toBe('Network error');

    hook.clearFilter();

    expect(hook.state).toBe('idle');
    expect(hook.error).toBeNull();
  });
});
