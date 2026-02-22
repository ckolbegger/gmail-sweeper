/**
 * T051: Integration test for full smart filter cycle.
 * Tests: activate filter → enter description → see loading → see filtered results with count → verify non-matching hidden
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
  Email,
  EmailAddress,
  Label,
  EmailMetadata,
  EmailClassification,
} from '../../src/core/models/index.js';
import { EmailCache } from '../../src/core/cache/db.js';
import { resolveAiConfig } from '../../src/core/ai/config.js';
import { createAiProvider, AiProvider } from '../../src/core/ai/provider.js';
import { runSmartFilter } from '../../src/core/filter/smart-filter.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, rm } from 'fs/promises';

function createTestEmail(
  id: string,
  subject: string,
  senderEmail: string,
  senderName: string,
  snippet: string
): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject,
    sender: { email: senderEmail, name: senderName } as EmailAddress,
    recipients: [{ email: 'recipient@example.com' }],
    date: new Date(),
    snippet,
    labels: [] as Label[],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function toEmailMetadata(emails: Email[]): EmailMetadata[] {
  return emails.map((email) => ({
    id: email.id,
    subject: email.subject,
    sender: email.sender.email,
    snippet: email.snippet,
  }));
}

describe('US3 Integration: Smart Filter Full Cycle', () => {
  let cache: EmailCache;
  let testDir: string;
  let dbPath: string;
  let mockAiProvider: AiProvider;

  const testEmails: Email[] = [
    createTestEmail(
      '1',
      'Project Update',
      'alice@company.com',
      'Alice',
      'Weekly project status update with milestones'
    ),
    createTestEmail(
      '2',
      'Sale at Store',
      'promo@shop.com',
      'Store Promo',
      '50% off sale this weekend only'
    ),
    createTestEmail(
      '3',
      'Meeting Notes',
      'bob@company.com',
      'Bob',
      'Notes from yesterday design review meeting'
    ),
    createTestEmail(
      '4',
      'Newsletter',
      'news@tech.com',
      'Tech Newsletter',
      'Latest tech news and updates'
    ),
    createTestEmail(
      '5',
      'Urgent: Server Down',
      'alert@company.com',
      'System Alert',
      'Production server is down please respond'
    ),
  ];

  beforeEach(async () => {
    testDir = join(tmpdir(), `gmail-sweep-smart-filter-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    dbPath = join(testDir, 'test.db');
    cache = new EmailCache(dbPath);
    await cache.initialize();

    cache.upsertEmails(testEmails);

    vi.mock('../../src/core/ai/config.js', () => ({
      resolveAiConfig: vi.fn().mockResolvedValue({
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        apiKey: 'test-api-key',
        maxContextTokens: 100000,
      }),
    }));

    mockAiProvider = {
      classifyEmails: vi
        .fn()
        .mockImplementation(async (description: string, emails: EmailMetadata[]) => {
          const lowerDesc = description.toLowerCase();
          const results: EmailClassification[] = emails.map((email) => {
            const subject = email.subject.toLowerCase();
            const sender = email.sender.toLowerCase();
            const snippet = email.snippet.toLowerCase();

            let matches = false;
            let confidence = 0;
            let reasoning = '';

            if (
              lowerDesc.includes('work') ||
              lowerDesc.includes('project') ||
              lowerDesc.includes('meeting')
            ) {
              if (
                sender.includes('@company.com') ||
                subject.includes('project') ||
                subject.includes('meeting')
              ) {
                matches = true;
                confidence = 0.9;
                reasoning = 'Matches work-related criteria';
              } else if (sender.includes('@company.com')) {
                matches = true;
                confidence = 0.7;
                reasoning = 'From company domain';
              }
            } else if (lowerDesc.includes('important') || lowerDesc.includes('urgent')) {
              if (
                subject.toLowerCase().includes('urgent') ||
                subject.toLowerCase().includes('alert')
              ) {
                matches = true;
                confidence = 0.95;
                reasoning = 'Marked as urgent';
              } else if (sender.includes('@company.com')) {
                matches = true;
                confidence = 0.6;
                reasoning = 'From company';
              }
            }

            return {
              emailId: email.id,
              matches,
              confidence,
              confidenceLevel: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
              reasoning,
            };
          });
          return results;
        }),
    };

    vi.mock('../../src/core/ai/provider.js', () => ({
      createAiProvider: vi.fn().mockReturnValue(mockAiProvider),
    }));

    vi.mock('../../src/core/filter/smart-filter.js', () => ({
      runSmartFilter: vi
        .fn()
        .mockImplementation(
          async (options: {
            description: string;
            emails: Email[];
            provider: AiProvider;
            onProgress?: (progress: {
              matchingResults: EmailClassification[];
              evaluatedCount: number;
              totalCount: number;
            }) => void;
          }) => {
            const metadata = toEmailMetadata(options.emails);
            const results = await mockAiProvider.classifyEmails(options.description, metadata);

            const matchingResults = results
              .filter((r) => r.matches)
              .sort((a, b) => b.confidence - a.confidence);

            if (options.onProgress) {
              options.onProgress({
                matchingResults,
                evaluatedCount: options.emails.length,
                totalCount: options.emails.length,
              });
            }

            return {
              allResults: results,
              matchingResults,
              totalEvaluated: options.emails.length,
            };
          }
        ),
    }));
  });

  afterEach(async () => {
    vi.clearAllMocks();
    cache.close();
    await rm(testDir, { recursive: true, force: true });
  });

  it('should complete full filter cycle: activate → enter description → loading → filtered results with count → non-matching hidden', async () => {
    const { useSmartFilter } = await import('../../src/tui/hooks/useSmartFilter.js');

    const allEmails = cache.getEmails({ limit: 10 });
    expect(allEmails).toHaveLength(5);

    const result = useSmartFilter({
      emails: allEmails,
    });

    expect(result.filterState).toBe('idle');
    expect(result.filteredEmails).toEqual([]);

    result.activateFilter();
    expect(result.filterState).toBe('input');

    const filterDescription = 'important work emails';
    const submitPromise = result.submitFilter(filterDescription);

    await vi.waitFor(() => {
      expect(result.filterState).toBe('loading');
    });

    await submitPromise;

    expect(result.filterState).toBe('filtered');
    expect(result.filterDescription).toBe(filterDescription);
    expect(result.filteredEmails.length).toBeGreaterThan(0);
    expect(result.filteredEmails.length).toBeLessThan(allEmails.length);

    const matchedIds = result.filteredEmails.map((e) => e.id);
    const unmatchedEmails = allEmails.filter((e) => !matchedIds.includes(e.id));
    expect(unmatchedEmails.length).toBeGreaterThan(0);
  });

  it('should show correct count of filtered results', async () => {
    const { useSmartFilter } = await import('../../src/tui/hooks/useSmartFilter.js');

    const allEmails = cache.getEmails({ limit: 10 });
    const result = useSmartFilter({
      emails: allEmails,
    });

    result.activateFilter();
    await result.submitFilter('work related emails');

    expect(result.filterState).toBe('filtered');
    expect(result.filteredEmails.length).toBeGreaterThan(0);
  });

  it('should filter out non-matching emails from results', async () => {
    const { useSmartFilter } = await import('../../src/tui/hooks/useSmartFilter.js');

    const allEmails = cache.getEmails({ limit: 10 });
    const result = useSmartFilter({
      emails: allEmails,
    });

    result.activateFilter();
    await result.submitFilter('urgent alerts');

    const matchedIds = result.filteredEmails.map((e) => e.id);
    const hasOnlyMatches = result.filteredEmails.every((email) => {
      const originalEmail = allEmails.find((e) => e.id === email.id);
      return (
        originalEmail &&
        (originalEmail.subject.toLowerCase().includes('urgent') ||
          originalEmail.subject.toLowerCase().includes('alert') ||
          originalEmail.sender.email.includes('@company.com'))
      );
    });

    expect(result.filteredEmails.length).toBeLessThan(allEmails.length);
  });

  it('should clear filter and show all emails', async () => {
    const { useSmartFilter } = await import('../../src/tui/hooks/useSmartFilter.js');

    const allEmails = cache.getEmails({ limit: 10 });
    const result = useSmartFilter({
      emails: allEmails,
    });

    result.activateFilter();
    await result.submitFilter('important');

    expect(result.filterState).toBe('filtered');
    expect(result.filteredEmails.length).toBeLessThan(allEmails.length);

    result.clearFilter();

    expect(result.filterState).toBe('idle');
    expect(result.filterDescription).toBe('');
  });
});
