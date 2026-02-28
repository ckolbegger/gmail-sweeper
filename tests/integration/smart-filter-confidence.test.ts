/**
 * Integration test for confidence display
 *
 * T038: Test that filtered results show confidence indicators and are ordered by confidence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Email } from '@/core/models/email.js';
import type { AiProvider, EmailClassification } from '@/core/ai/provider.js';
import { toConfidenceLevel } from '@/core/ai/provider.js';
import { runSmartFilter } from '@/core/filter/smart-filter.js';

// Mock dependencies - must be before imports
vi.mock('@/core/ai/config.js', () => ({
  resolveAiConfig: vi.fn(),
}));

// Only mock createAiProvider, not toConfidenceLevel
vi.mock('@/core/ai/provider.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/core/ai/provider.js')>();
  return {
    ...original,
    createAiProvider: vi.fn(),
  };
});

import { resolveAiConfig } from '@/core/ai/config.js';
import { createAiProvider } from '@/core/ai/provider.js';

const mockResolveAiConfig = vi.mocked(resolveAiConfig);
const mockCreateAiProvider = vi.mocked(createAiProvider);

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
    dateReceived: new Date('2024-01-15'),
    body: { text: 'Test body' },
    labels: [],
    isRead: true,
    snippet: 'Test snippet',
    historyId: '123',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('Smart Filter Confidence Display - Integration (T038)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAiConfig.mockReturnValue({
      provider: 'anthropic',
      apiKey: 'test-api-key',
      maxContextTokens: 32000,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return results with confidence indicators', async () => {
    const emails = [
      createTestEmail({ id: 'email-1', subject: 'Newsletter A' }),
      createTestEmail({ id: 'email-2', subject: 'Newsletter B' }),
      createTestEmail({ id: 'email-3', subject: 'Meeting Notes' }),
    ];

    // Mock AI provider returning classifications with different confidence levels
    const mockProvider: AiProvider = {
      classifyEmails: vi.fn().mockResolvedValue([
        { emailId: 'email-1', matches: true, confidence: 0.95, reasoning: 'Newsletter' },
        { emailId: 'email-2', matches: true, confidence: 0.65, reasoning: 'Newsletter' },
        { emailId: 'email-3', matches: true, confidence: 0.35, reasoning: 'Maybe' },
      ]),
    };
    mockCreateAiProvider.mockReturnValue(mockProvider);

    const result = await runSmartFilter({
      emails,
      description: 'newsletters',
      provider: mockProvider,
      maxContextTokens: 32000,
    });

    // Verify classifications include confidence
    expect(result.classifications).toHaveLength(3);
    expect(result.classifications[0].confidence).toBe(0.95);
    expect(result.classifications[1].confidence).toBe(0.65);
    expect(result.classifications[2].confidence).toBe(0.35);
  });

  it('should order results by confidence descending', async () => {
    const highConfidenceEmail = createTestEmail({ id: 'email-high', subject: 'High Match' });
    const mediumConfidenceEmail = createTestEmail({ id: 'email-medium', subject: 'Medium Match' });
    const lowConfidenceEmail = createTestEmail({ id: 'email-low', subject: 'Low Match' });

    // Emails in arbitrary order
    const allEmails = [mediumConfidenceEmail, lowConfidenceEmail, highConfidenceEmail];

    // Mock AI provider returns classifications in arbitrary order
    const mockProvider: AiProvider = {
      classifyEmails: vi.fn().mockResolvedValue([
        { emailId: 'email-medium', matches: true, confidence: 0.6 },
        { emailId: 'email-low', matches: true, confidence: 0.3 },
        { emailId: 'email-high', matches: true, confidence: 0.9 },
      ]),
    };
    mockCreateAiProvider.mockReturnValue(mockProvider);

    const result = await runSmartFilter({
      emails: allEmails,
      description: 'test',
      provider: mockProvider,
      maxContextTokens: 32000,
    });

    // Verify classifications are sorted by confidence (highest first)
    expect(result.classifications).toHaveLength(3);
    expect(result.classifications[0].confidence).toBeGreaterThanOrEqual(
      result.classifications[1].confidence
    );
    expect(result.classifications[1].confidence).toBeGreaterThanOrEqual(
      result.classifications[2].confidence
    );

    // First classification should be highest confidence
    expect(result.classifications[0].emailId).toBe('email-high');
    expect(result.classifications[0].confidence).toBe(0.9);

    // Verify filtered emails are sorted by confidence (highest first)
    expect(result.filteredEmails).toHaveLength(3);
    expect(result.filteredEmails[0].id).toBe('email-high');
    expect(result.filteredEmails[1].id).toBe('email-medium');
    expect(result.filteredEmails[2].id).toBe('email-low');
  });

  it('should map numeric confidence to confidence levels correctly', () => {
    // Test the actual toConfidenceLevel function (not mocked)
    expect(toConfidenceLevel(0.95)).toBe('high');
    expect(toConfidenceLevel(0.8)).toBe('high');
    expect(toConfidenceLevel(0.79)).toBe('medium');
    expect(toConfidenceLevel(0.5)).toBe('medium');
    expect(toConfidenceLevel(0.49)).toBe('low');
    expect(toConfidenceLevel(0.1)).toBe('low');
    expect(toConfidenceLevel(0.0)).toBe('low');
    expect(toConfidenceLevel(1.0)).toBe('high');
  });

  it('should handle emails with no matches', async () => {
    const emails = [
      createTestEmail({ id: 'email-1', subject: 'Unrelated' }),
      createTestEmail({ id: 'email-2', subject: 'Also Unrelated' }),
    ];

    const mockProvider: AiProvider = {
      classifyEmails: vi.fn().mockResolvedValue([
        { emailId: 'email-1', matches: false, confidence: 0.1, reasoning: 'Not a match' },
        { emailId: 'email-2', matches: false, confidence: 0.15, reasoning: 'Not a match' },
      ]),
    };
    mockCreateAiProvider.mockReturnValue(mockProvider);

    const result = await runSmartFilter({
      emails,
      description: 'newsletters',
      provider: mockProvider,
      maxContextTokens: 32000,
    });

    expect(result.filteredEmails).toHaveLength(0);
    expect(result.classifications).toHaveLength(2);
  });

  it('should include only matching emails in filtered results', async () => {
    const matchingEmail = createTestEmail({ id: 'email-match', subject: 'Newsletter' });
    const nonMatchingEmail = createTestEmail({ id: 'email-nomatch', subject: 'Receipt' });

    const mockProvider: AiProvider = {
      classifyEmails: vi.fn().mockResolvedValue([
        { emailId: 'email-match', matches: true, confidence: 0.9 },
        { emailId: 'email-nomatch', matches: false, confidence: 0.1 },
      ]),
    };
    mockCreateAiProvider.mockReturnValue(mockProvider);

    const result = await runSmartFilter({
      emails: [matchingEmail, nonMatchingEmail],
      description: 'newsletters',
      provider: mockProvider,
      maxContextTokens: 32000,
    });

    expect(result.filteredEmails).toHaveLength(1);
    expect(result.filteredEmails[0].id).toBe('email-match');
  });
});
