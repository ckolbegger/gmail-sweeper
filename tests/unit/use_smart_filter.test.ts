import { describe, expect, it, vi } from 'vitest';

import type { EmailClassification } from '@/adapters/ai/provider.js';
import { createEmail, type Email } from '@/core/entities.js';
import * as smartFilterHook from '@/tui/use_smart_filter.js';

interface SmartFilterState {
  status: 'idle' | 'input' | 'loading' | 'filtered' | 'error';
  draft: string;
  description: string;
  errorMessage?: string;
  visibleEmailIds: string[];
  totalEmails: number;
  matchingCount: number;
  summaryLine: string;
  confidenceByEmailId: Record<string, number>;
}

interface SmartFilterController {
  state: SmartFilterState;
  beginInput: () => void;
  setDraft: (value: string) => void;
  submit: () => Promise<void>;
  clear: () => void;
}

const EMAILS: Email[] = [
  createEmail({
    message_id: 'msg-1',
    received_at: Date.parse('2026-02-10T10:00:00Z'),
    subject: 'Newsletter',
    sender: 'news@example.com'
  }),
  createEmail({
    message_id: 'msg-2',
    received_at: Date.parse('2026-02-11T10:00:00Z'),
    subject: 'Receipt',
    sender: 'billing@shop.com'
  })
];

function getUseSmartFilter(): (options: {
  emails: Email[];
  provider: { classifyEmails: ReturnType<typeof vi.fn> } | null;
  runSmartFilter: ReturnType<typeof vi.fn>;
}) => SmartFilterController {
  const useSmartFilter = (smartFilterHook as { useSmartFilter?: unknown }).useSmartFilter;
  if (typeof useSmartFilter !== 'function') {
    throw new Error('useSmartFilter is not implemented');
  }

  return useSmartFilter as (options: {
    emails: Email[];
    provider: { classifyEmails: ReturnType<typeof vi.fn> } | null;
    runSmartFilter: ReturnType<typeof vi.fn>;
  }) => SmartFilterController;
}

describe('useSmartFilter', () => {
  it('should apply filter results and expose filtered state', async () => {
    const useSmartFilter = getUseSmartFilter();
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [
        { emailId: 'msg-1', matches: false, confidence: 0.2 },
        { emailId: 'msg-2', matches: true, confidence: 0.9 }
      ] satisfies EmailClassification[],
      matchingResults: [{ emailId: 'msg-2', matches: true, confidence: 0.9 }],
      totalEvaluated: 2
    });
    const provider = { classifyEmails: vi.fn() };
    const filter = useSmartFilter({
      emails: EMAILS,
      provider,
      runSmartFilter
    });

    filter.beginInput();
    filter.setDraft('purchase receipts');
    await filter.submit();

    expect(filter.state.status).toBe('filtered');
    expect(filter.state.description).toBe('purchase receipts');
    expect(filter.state.visibleEmailIds).toEqual(['msg-2']);
    expect(filter.state.summaryLine).toBe('Filtered: 1/2 emails');
    expect(filter.state.confidenceByEmailId).toEqual({ 'msg-2': 0.9 });
  });

  it('should surface a configuration error when provider is unavailable', async () => {
    const useSmartFilter = getUseSmartFilter();
    const runSmartFilter = vi.fn();
    const filter = useSmartFilter({
      emails: EMAILS,
      provider: null,
      runSmartFilter
    });

    filter.beginInput();
    filter.setDraft('receipts');
    await filter.submit();

    expect(filter.state.status).toBe('error');
    expect(filter.state.errorMessage).toContain('AI_PROVIDER');
    expect(runSmartFilter).not.toHaveBeenCalled();
  });

  it('should clear active filter and restore full inbox state', async () => {
    const useSmartFilter = getUseSmartFilter();
    const runSmartFilter = vi.fn().mockResolvedValue({
      allResults: [{ emailId: 'msg-2', matches: true, confidence: 0.8 }],
      matchingResults: [{ emailId: 'msg-2', matches: true, confidence: 0.8 }],
      totalEvaluated: 1
    });
    const filter = useSmartFilter({
      emails: EMAILS,
      provider: { classifyEmails: vi.fn() },
      runSmartFilter
    });

    filter.beginInput();
    filter.setDraft('receipts');
    await filter.submit();
    filter.clear();

    expect(filter.state.status).toBe('idle');
    expect(filter.state.description).toBe('');
    expect(filter.state.visibleEmailIds).toEqual(['msg-1', 'msg-2']);
    expect(filter.state.summaryLine).toBe('');
  });
});
