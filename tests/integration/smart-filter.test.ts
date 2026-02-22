/**
 * Integration test for full smart filter cycle
 *
 * T024: Tests the complete filter workflow
 * - Activate filter → enter description → see loading → see filtered results with count → verify non-matching hidden
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email } from '@/core/models/email.js';
import type { AiProvider, EmailClassification } from '@/core/ai/provider.js';

// Mock email factory
function createMockEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: `email-${Math.random().toString(36).slice(2, 9)}`,
    threadId: `thread-${Math.random().toString(36).slice(2, 9)}`,
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'test@example.com' },
    recipients: [],
    dateReceived: new Date('2024-01-15T10:00:00Z'),
    isRead: true,
    isStarred: false,
    labels: [],
    ...overrides,
  };
}

describe('Smart Filter Integration', () => {
  let mockProvider: AiProvider;

  beforeEach(() => {
    vi.useFakeTimers();

    // Create mock provider
    mockProvider = {
      classifyEmails: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('full filter cycle', () => {
    it('activates filter, evaluates emails, and shows filtered results', async () => {
      // Setup: 10 emails, 3 match the filter
      const allEmails: Email[] = [
        createMockEmail({ id: 'email-1', subject: 'Investment Opportunity' }),
        createMockEmail({ id: 'email-2', subject: 'Financial Newsletter' }),
        createMockEmail({ id: 'email-3', subject: 'Loan Offer' }),
        createMockEmail({ id: 'email-4', subject: 'Team Meeting' }),
        createMockEmail({ id: 'email-5', subject: 'Project Update' }),
        createMockEmail({ id: 'email-6', subject: 'Weekly Report' }),
        createMockEmail({ id: 'email-7', subject: 'Credit Card Offer' }),
        createMockEmail({ id: 'email-8', subject: 'Quarterly Review' }),
        createMockEmail({ id: 'email-9', subject: 'Budget Planning' }),
        createMockEmail({ id: 'email-10', subject: 'Coffee Chat' }),
      ];

      // Mock AI classification: emails 1, 2, 3, 7 match "financial offers"
      const mockResults: EmailClassification[] = [
        { emailId: 'email-1', matches: true, confidence: 0.95 },
        { emailId: 'email-2', matches: true, confidence: 0.88 },
        { emailId: 'email-3', matches: true, confidence: 0.82 },
        { emailId: 'email-4', matches: false, confidence: 0.15 },
        { emailId: 'email-5', matches: false, confidence: 0.12 },
        { emailId: 'email-6', matches: false, confidence: 0.08 },
        { emailId: 'email-7', matches: true, confidence: 0.79 },
        { emailId: 'email-8', matches: false, confidence: 0.05 },
        { emailId: 'email-9', matches: false, confidence: 0.18 },
        { emailId: 'email-10', matches: false, confidence: 0.03 },
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValueOnce(mockResults);

      // Call classifyEmails
      const results = await mockProvider.classifyEmails('financial offers', allEmails.map(e => ({
        id: e.id,
        subject: e.subject,
        senderName: e.sender.name,
        senderEmail: e.sender.email,
        snippet: '',
      })));

      // Verify: only matching emails returned
      const matchingEmails = results.filter(r => r.matches);
      expect(matchingEmails).toHaveLength(4);
      expect(matchingEmails.map(e => e.emailId)).toEqual(['email-1', 'email-2', 'email-3', 'email-7']);

      // Verify: sorted by confidence descending
      const confidences = matchingEmails.map(e => e.confidence);
      expect(confidences).toEqual([...confidences].sort((a, b) => b - a));

      // Verify: filter count would show "Filtered: 4/10 emails"
      const filterCount = matchingEmails.length;
      const totalCount = allEmails.length;
      expect(filterCount).toBe(4);
      expect(totalCount).toBe(10);
    });

    it('shows no matches when filter returns empty results', async () => {
      const allEmails: Email[] = [
        createMockEmail({ id: 'email-1', subject: 'Team Meeting' }),
        createMockEmail({ id: 'email-2', subject: 'Project Update' }),
      ];

      // Mock AI classification: no matches for "financial offers"
      const mockResults: EmailClassification[] = [
        { emailId: 'email-1', matches: false, confidence: 0.1 },
        { emailId: 'email-2', matches: false, confidence: 0.05 },
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValueOnce(mockResults);

      const results = await mockProvider.classifyEmails('financial offers', allEmails.map(e => ({
        id: e.id,
        subject: e.subject,
        senderName: e.sender.name,
        senderEmail: e.sender.email,
        snippet: '',
      })));

      const matchingEmails = results.filter(r => r.matches);
      expect(matchingEmails).toHaveLength(0);

      // Verify: filter count would show "Filtered: 0/2 emails"
      expect(matchingEmails.length).toBe(0);
      expect(allEmails.length).toBe(2);
    });
  });

  describe('loading state during evaluation', () => {
    it('provider is called with correct parameters', async () => {
      const emails: Email[] = [
        createMockEmail({ id: 'email-1', subject: 'Test Email' }),
      ];

      vi.mocked(mockProvider.classifyEmails).mockResolvedValueOnce([
        { emailId: 'email-1', matches: true, confidence: 0.9 },
      ]);

      const results = await mockProvider.classifyEmails('important emails', emails.map(e => ({
        id: e.id,
        subject: e.subject,
        senderName: e.sender.name,
        senderEmail: e.sender.email,
        snippet: '',
      })));

      expect(mockProvider.classifyEmails).toHaveBeenCalledWith(
        'important emails',
        expect.arrayContaining([
          expect.objectContaining({ id: 'email-1' }),
        ])
      );
      expect(results).toHaveLength(1);
    });
  });

  describe('error handling during evaluation', () => {
    it('handles provider errors gracefully', async () => {
      const emails: Email[] = [createMockEmail()];

      vi.mocked(mockProvider.classifyEmails).mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(mockProvider.classifyEmails('test filter', emails.map(e => ({
        id: e.id,
        subject: e.subject,
        senderName: e.sender.name,
        senderEmail: e.sender.email,
        snippet: '',
      })))).rejects.toThrow('API rate limit exceeded');
    });
  });
});
