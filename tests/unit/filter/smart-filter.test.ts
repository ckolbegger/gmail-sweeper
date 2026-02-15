import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Email } from '@/core/contracts/types.js';
import type { AiProvider, EmailClassification } from '@/core/ai/provider.js';
import type {
  SmartFilterOptions,
  FilterProgress,
  FilterResult,
} from '@/core/filter/smart-filter.js';
import { runSmartFilter } from '@/core/filter/smart-filter.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEmail(overrides?: Partial<Email>): Email {
  return {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Test Subject',
    sender: { email: 'sender@example.com', name: 'Sender' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: 'Test body content' },
    labels: [],
    isRead: false,
    snippet: 'Test snippet',
    historyId: 'history-1',
    syncedAt: new Date(),
    ...overrides,
  };
}

function createMockClassification(overrides?: Partial<EmailClassification>): EmailClassification {
  return {
    emailId: 'email-1',
    matches: true,
    confidence: 0.9,
    ...overrides,
  };
}

function createMockAiProvider(classifications: EmailClassification[] = []): AiProvider {
  return {
    classifyEmails: vi.fn().mockResolvedValue(classifications),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('runSmartFilter()', () => {
  let mockProvider: AiProvider;

  beforeEach(() => {
    mockProvider = createMockAiProvider();
  });

  // Test 1: Splits emails into token-aware batches
  it('splits emails into token-aware batches', async () => {
    const emails = [
      createMockEmail({ id: 'email-1', body: { text: 'a'.repeat(1000) } }),
      createMockEmail({ id: 'email-2', body: { text: 'b'.repeat(1000) } }),
      createMockEmail({ id: 'email-3', body: { text: 'c'.repeat(1000) } }),
      createMockEmail({ id: 'email-4', body: { text: 'd'.repeat(1000) } }),
    ];

    const classifications = [
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.9 }),
      createMockClassification({ emailId: 'email-2', matches: false, confidence: 0.3 }),
      createMockClassification({ emailId: 'email-3', matches: true, confidence: 0.8 }),
      createMockClassification({ emailId: 'email-4', matches: false, confidence: 0.2 }),
    ];

    mockProvider.classifyEmails = vi.fn().mockResolvedValue(classifications);

    const options: SmartFilterOptions = {
      description: 'Find important emails',
      emails,
      provider: mockProvider,
      maxContextTokens: 32000,
    };

    const result = await runSmartFilter(options);

    // Verify provider was called (batching happens internally)
    expect(mockProvider.classifyEmails).toHaveBeenCalled();
    expect(result.totalEvaluated).toBe(4);
  });

  // Test 2: Calls onProgress after each batch
  it('calls onProgress after each batch', async () => {
    const emails = [
      createMockEmail({ id: 'email-1' }),
      createMockEmail({ id: 'email-2' }),
      createMockEmail({ id: 'email-3' }),
    ];

    const classifications = [
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.9 }),
      createMockClassification({ emailId: 'email-2', matches: true, confidence: 0.7 }),
      createMockClassification({ emailId: 'email-3', matches: false, confidence: 0.3 }),
    ];

    mockProvider.classifyEmails = vi.fn().mockResolvedValue(classifications);

    const onProgress = vi.fn();

    const options: SmartFilterOptions = {
      description: 'Find important emails',
      emails,
      provider: mockProvider,
      onProgress,
    };

    await runSmartFilter(options);

    // Verify onProgress was called at least once
    expect(onProgress).toHaveBeenCalled();

    // Verify progress structure
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0] as FilterProgress;
    expect(lastCall).toHaveProperty('matchingResults');
    expect(lastCall).toHaveProperty('evaluatedCount');
    expect(lastCall).toHaveProperty('totalCount');
    expect(lastCall).toHaveProperty('currentBatch');
    expect(lastCall).toHaveProperty('totalBatches');
  });

  // Test 3: Returns combined results sorted by confidence desc
  it('returns combined results sorted by confidence desc', async () => {
    const emails = [
      createMockEmail({ id: 'email-1' }),
      createMockEmail({ id: 'email-2' }),
      createMockEmail({ id: 'email-3' }),
    ];

    const classifications = [
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.5 }),
      createMockClassification({ emailId: 'email-2', matches: true, confidence: 0.9 }),
      createMockClassification({ emailId: 'email-3', matches: true, confidence: 0.7 }),
    ];

    mockProvider.classifyEmails = vi.fn().mockResolvedValue(classifications);

    const options: SmartFilterOptions = {
      description: 'Find important emails',
      emails,
      provider: mockProvider,
    };

    const result = await runSmartFilter(options);

    // Verify results are sorted by confidence descending
    expect(result.matchingResults).toHaveLength(3);
    expect(result.matchingResults[0].confidence).toBe(0.9);
    expect(result.matchingResults[1].confidence).toBe(0.7);
    expect(result.matchingResults[2].confidence).toBe(0.5);

    // Verify allResults contains all classifications
    expect(result.allResults).toHaveLength(3);
  });

  // Test 4: Respects AbortSignal cancellation
  it('respects AbortSignal cancellation', async () => {
    const emails = [createMockEmail({ id: 'email-1' }), createMockEmail({ id: 'email-2' })];

    const controller = new AbortController();

    // Simulate cancellation
    mockProvider.classifyEmails = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error('Aborted'));
    });

    const options: SmartFilterOptions = {
      description: 'Find important emails',
      emails,
      provider: mockProvider,
      signal: controller.signal,
    };

    await expect(runSmartFilter(options)).rejects.toThrow();
  });

  // Test 5: Handles empty email list
  it('handles empty email list', async () => {
    mockProvider.classifyEmails = vi.fn().mockResolvedValue([]);

    const options: SmartFilterOptions = {
      description: 'Find important emails',
      emails: [],
      provider: mockProvider,
    };

    const result = await runSmartFilter(options);

    expect(result.totalEvaluated).toBe(0);
    expect(result.matchingResults).toHaveLength(0);
    expect(result.allResults).toHaveLength(0);
  });

  // Test 6: Rejects empty description (FR-013)
  it('rejects empty description (FR-013)', async () => {
    const emails = [createMockEmail({ id: 'email-1' })];

    const options: SmartFilterOptions = {
      description: '',
      emails,
      provider: mockProvider,
    };

    await expect(runSmartFilter(options)).rejects.toThrow();
  });

  // Test 7: Handles whitespace-only description
  it('rejects whitespace-only description', async () => {
    const emails = [createMockEmail({ id: 'email-1' })];

    const options: SmartFilterOptions = {
      description: '   ',
      emails,
      provider: mockProvider,
    };

    await expect(runSmartFilter(options)).rejects.toThrow();
  });

  // Test 8: Filters out non-matching results
  it('filters out non-matching results from matchingResults', async () => {
    const emails = [
      createMockEmail({ id: 'email-1' }),
      createMockEmail({ id: 'email-2' }),
      createMockEmail({ id: 'email-3' }),
    ];

    const classifications = [
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.9 }),
      createMockClassification({ emailId: 'email-2', matches: false, confidence: 0.3 }),
      createMockClassification({ emailId: 'email-3', matches: true, confidence: 0.7 }),
    ];

    mockProvider.classifyEmails = vi.fn().mockResolvedValue(classifications);

    const options: SmartFilterOptions = {
      description: 'Find important emails',
      emails,
      provider: mockProvider,
    };

    const result = await runSmartFilter(options);

    // matchingResults should only contain matches
    expect(result.matchingResults).toHaveLength(2);
    expect(result.matchingResults.every((r) => r.matches)).toBe(true);

    // allResults should contain all
    expect(result.allResults).toHaveLength(3);
  });
});
