import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSmartFilter } from '../../../../src/services/filter/smartFilter';
import { AiProvider } from '../../../../src/services/ai/provider';
import { Email } from '../../../../src/types';
import * as batchSizing from '../../../../src/services/filter/batchSizing';

vi.mock('../../../../src/services/filter/batchSizing');

describe('runSmartFilter', () => {
  const mockEmails: Email[] = [
    { id: '1', subject: 'Receipt 1', from: 'sender@test.com', snippet: 'Your receipt', internalDate: '1000', body: '...' },
    { id: '2', subject: 'Newsletter', from: 'news@test.com', snippet: 'Weekly news', internalDate: '2000', body: '...' },
  ];

  const mockProvider: AiProvider = {
    classifyEmails: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(batchSizing.calculateBatchSize).mockReturnValue(2);
  });

  it('should process emails in a single batch if they fit', async () => {
    const mockResponse = {
      results: [
        { emailId: '1', matches: true, confidence: 0.9, reasoning: 'Match' },
        { emailId: '2', matches: false, confidence: 0.1, reasoning: 'No match' },
      ]
    };
    vi.mocked(mockProvider.classifyEmails).mockResolvedValue(mockResponse);

    const onProgress = vi.fn();
    const result = await runSmartFilter({
      description: 'receipts',
      emails: mockEmails,
      provider: mockProvider,
      onProgress
    });

    expect(result.allResults).toHaveLength(2);
    expect(result.matchingResults).toHaveLength(1);
    expect(result.matchingResults[0].emailId).toBe('1');
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      evaluatedCount: 2,
      totalCount: 2,
      currentBatch: 1,
      totalBatches: 1
    }));
  });

  it('should process emails in multiple batches', async () => {
    vi.mocked(batchSizing.calculateBatchSize).mockReturnValue(1);
    
    vi.mocked(mockProvider.classifyEmails)
      .mockResolvedValueOnce({
        results: [{ emailId: '1', matches: true, confidence: 0.9, reasoning: 'Match 1' }]
      })
      .mockResolvedValueOnce({
        results: [{ emailId: '2', matches: true, confidence: 0.8, reasoning: 'Match 2' }]
      });

    const onProgress = vi.fn();
    const result = await runSmartFilter({
      description: 'receipts',
      emails: mockEmails,
      provider: mockProvider,
      onProgress
    });

    expect(result.allResults).toHaveLength(2);
    expect(result.matchingResults).toHaveLength(2);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({
      evaluatedCount: 1,
      currentBatch: 1,
      totalBatches: 2
    }));
    expect(onProgress).toHaveBeenNthCalledWith(2, expect.objectContaining({
      evaluatedCount: 2,
      currentBatch: 2,
      totalBatches: 2
    }));
  });

  it('should sort matching results by confidence descending', async () => {
    vi.mocked(mockProvider.classifyEmails).mockResolvedValue({
      results: [
        { emailId: '1', matches: true, confidence: 0.7, reasoning: 'Low match' },
        { emailId: '2', matches: true, confidence: 0.9, reasoning: 'High match' },
      ]
    });

    const result = await runSmartFilter({
      description: 'test',
      emails: mockEmails,
      provider: mockProvider
    });

    expect(result.matchingResults[0].emailId).toBe('2');
    expect(result.matchingResults[1].emailId).toBe('1');
  });

  it('should handle cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    vi.mocked(mockProvider.classifyEmails).mockImplementation(async () => {
      // Simulate some work
      return new Promise((resolve) => setTimeout(() => resolve({ results: [] }), 10));
    });

    const promise = runSmartFilter({
      description: 'test',
      emails: mockEmails,
      provider: mockProvider,
      signal: controller.signal
    });

    controller.abort();

    await expect(promise).rejects.toThrow();
  });
});
