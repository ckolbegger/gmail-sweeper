// @vitest-environment jsdom
/**
 * T028: Integration test for clear filter flow.
 *
 * Tests the full cycle: apply filter → verify filtered → clear → verify full list restored.
 * Uses real runSmartFilter + real useSmartFilter hook with a mock AI provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Email } from '../../src/core/models/index.js';
import type { AiProviderConfig } from '../../src/core/ai/provider.js';
import type { ClassifyEmailsRequest } from '../../src/core/ai/provider.js';

// Mock only the AI config resolution and provider creation — use real runSmartFilter
const mockResolveAiConfig = vi.fn<() => AiProviderConfig | null>();
const mockCreateAiProvider = vi.fn();

vi.mock('../../src/core/ai/config.js', () => ({
  resolveAiConfig: (...args: unknown[]) => mockResolveAiConfig(...(args as [])),
}));

vi.mock('../../src/core/ai/provider.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/ai/provider.js')>();
  return {
    ...actual,
    createAiProvider: (...args: unknown[]) => mockCreateAiProvider(...args),
  };
});

import { useSmartFilter } from '../../src/tui/hooks/useSmartFilter.js';

function makeEmail(id: string, subject: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject,
    sender: { email: `sender${id}@test.com`, name: `Sender ${id}` },
    recipients: [],
    date: new Date('2026-01-01'),
    snippet: `Snippet for ${subject}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

const emails = [
  makeEmail('1', 'Meeting invite: Q1 planning'),
  makeEmail('2', 'Newsletter: Weekly digest'),
  makeEmail('3', 'Meeting notes: Standup'),
  makeEmail('4', 'Promo: 50% off sale'),
  makeEmail('5', 'Meeting reminder: 1-on-1'),
];

const defaultConfig: AiProviderConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
};

describe('T028: Clear Filter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAiConfig.mockReturnValue(defaultConfig);

    // Mock provider: matches emails with "meeting" in subject
    mockCreateAiProvider.mockReturnValue({
      classifyEmails: vi.fn().mockImplementation((request: ClassifyEmailsRequest) => ({
        results: request.emails.map((e) => {
          const isMeeting = e.subject.toLowerCase().includes('meeting');
          return {
            emailId: e.id,
            matches: isMeeting,
            confidence: isMeeting ? 0.9 : 0.1,
          };
        }),
      })),
    });
  });

  it('apply filter → verify filtered → clear → verify full list restored', async () => {
    const { result } = renderHook(() => useSmartFilter({ emails }));

    // Initial state: idle, no filter
    expect(result.current.status).toBe('idle');
    expect(result.current.filteredEmails).toHaveLength(0);
    expect(result.current.filterDescription).toBe('');

    // Activate filter input
    act(() => { result.current.activateFilter(); });
    expect(result.current.status).toBe('input');

    // Submit filter
    await act(async () => {
      result.current.submitFilter('meeting invites and reminders');
    });

    // Should now be in filtered state with only meeting emails
    expect(result.current.status).toBe('filtered');
    expect(result.current.filteredEmails).toHaveLength(3);
    expect(result.current.filterDescription).toBe('meeting invites and reminders');
    expect(result.current.filteredEmails.every(e => e.subject.toLowerCase().includes('meeting'))).toBe(true);

    // Clear the filter
    act(() => { result.current.clearFilter(); });

    // Full list restored, filter description gone
    expect(result.current.status).toBe('idle');
    expect(result.current.filteredEmails).toHaveLength(0);
    expect(result.current.filterDescription).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBeNull();
  });

  it('clear when no filter active is a no-op', () => {
    const { result } = renderHook(() => useSmartFilter({ emails }));

    expect(result.current.status).toBe('idle');

    act(() => { result.current.clearFilter(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.filteredEmails).toHaveLength(0);
  });

  it('clear during input state returns to idle', () => {
    const { result } = renderHook(() => useSmartFilter({ emails }));

    act(() => { result.current.activateFilter(); });
    expect(result.current.status).toBe('input');

    act(() => { result.current.clearFilter(); });
    expect(result.current.status).toBe('idle');
  });

  it('clear after error returns to idle with no error', async () => {
    mockResolveAiConfig.mockReturnValue(null);

    const { result } = renderHook(() => useSmartFilter({ emails }));

    act(() => { result.current.activateFilter(); });
    await act(async () => { result.current.submitFilter('meetings'); });

    expect(result.current.status).toBe('error');

    act(() => { result.current.clearFilter(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
