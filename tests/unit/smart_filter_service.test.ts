import { describe, expect, it, vi } from 'vitest';

import { createEmail, type Email } from '@/core/entities.js';
import type { EmailClassification } from '@/adapters/ai/provider.js';
import * as smartFilterService from '@/services/smart_filter_service.js';

const EMAILS: Email[] = [
  createEmail({
    message_id: 'msg-1',
    subject: 'Receipt from Store',
    sender: 'billing@shop.com',
    received_at: Date.parse('2026-02-11T10:00:00Z')
  }),
  createEmail({
    message_id: 'msg-2',
    subject: 'Weekly newsletter',
    sender: 'news@example.com',
    received_at: Date.parse('2026-02-12T10:00:00Z')
  }),
  createEmail({
    message_id: 'msg-3',
    subject: 'Your invoice',
    sender: 'billing@vendor.com',
    received_at: Date.parse('2026-02-13T10:00:00Z')
  })
];

interface RunSmartFilterFn {
  (
    options: {
      description: string;
      emails: Email[];
      provider: {
        classifyEmails: ReturnType<typeof vi.fn>;
      };
      maxContextTokens?: number;
      onProgress?: (progress: {
        matchingResults: EmailClassification[];
        evaluatedCount: number;
        totalCount: number;
        currentBatch: number;
        totalBatches: number;
      }) => void;
      signal?: AbortSignal;
    },
    deps?: {
      estimateTokens?: (content: string) => number;
      calculateBatchSize?: (tokenEstimates: number[], maxContextTokens: number) => number;
    }
  ): Promise<{
    allResults: EmailClassification[];
    matchingResults: EmailClassification[];
    totalEvaluated: number;
  }>;
}

function getRunSmartFilter(): RunSmartFilterFn {
  const runSmartFilter = (smartFilterService as { runSmartFilter?: RunSmartFilterFn }).runSmartFilter;
  if (!runSmartFilter) {
    throw new Error('runSmartFilter is not implemented');
  }

  return runSmartFilter;
}

describe('runSmartFilter', () => {
  it('should evaluate emails in batches and emit progress after each batch', async () => {
    const runSmartFilter = getRunSmartFilter();
    const provider = {
      classifyEmails: vi
        .fn()
        .mockResolvedValueOnce({
          results: [
            { emailId: 'msg-1', matches: true, confidence: 0.82 },
            { emailId: 'msg-2', matches: false, confidence: 0.12 }
          ]
        })
        .mockResolvedValueOnce({
          results: [{ emailId: 'msg-3', matches: true, confidence: 0.95 }]
        })
    };
    const onProgress = vi.fn();

    const result = await runSmartFilter(
      {
        description: 'purchase receipts',
        emails: EMAILS,
        provider,
        onProgress,
        maxContextTokens: 32000
      },
      {
        estimateTokens: () => 100,
        calculateBatchSize: () => 2
      }
    );

    expect(provider.classifyEmails).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0]?.[0]).toMatchObject({
      evaluatedCount: 2,
      totalCount: 3,
      currentBatch: 1,
      totalBatches: 2
    });
    expect(result.allResults).toHaveLength(3);
    expect(result.matchingResults.map((entry) => entry.emailId)).toEqual(['msg-3', 'msg-1']);
    expect(result.totalEvaluated).toBe(3);
  });

  it('should reject empty descriptions before calling provider', async () => {
    const runSmartFilter = getRunSmartFilter();
    const provider = {
      classifyEmails: vi.fn()
    };

    await expect(
      runSmartFilter({
        description: '   ',
        emails: EMAILS,
        provider
      })
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR'
    });
    expect(provider.classifyEmails).not.toHaveBeenCalled();
  });

  it('should return empty result for an empty email list', async () => {
    const runSmartFilter = getRunSmartFilter();
    const provider = {
      classifyEmails: vi.fn()
    };

    const result = await runSmartFilter({
      description: 'anything',
      emails: [],
      provider
    });

    expect(result).toEqual({
      allResults: [],
      matchingResults: [],
      totalEvaluated: 0
    });
    expect(provider.classifyEmails).not.toHaveBeenCalled();
  });
});
