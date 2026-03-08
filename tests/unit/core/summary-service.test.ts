import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummaryService } from '@/core/services/summary-service.js';
import type { AiProvider, LLMPrompt } from '@/core/ai/provider.js';
import type { Email } from '@/core/models/email.js';

function createTestEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-1',
    threadId: 'thread-1',
    subject: 'Test Email',
    sender: { name: 'Sender', email: 'sender@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-15'),
    body: { text: 'Test content' },
    labels: [],
    isRead: true,
    snippet: 'Test snippet',
    historyId: '123',
    syncedAt: new Date(),
    ...overrides,
  };
}

describe('SummaryService', () => {
  let mockProvider: AiProvider;
  let service: SummaryService;

  beforeEach(() => {
    mockProvider = {
      classifyEmails: vi.fn(),
      callLLM: vi.fn(),
    };
    service = new SummaryService(mockProvider);
  });

  describe('generateSummary', () => {
    it('should generate summary from LLM', async () => {
      const email = createTestEmail();
      const llmResponse = JSON.stringify({
        summary: 'Test summary',
        actionItems: ['Action 1', 'Action 2'],
      });

      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce(llmResponse);

      const result = await service.generateSummary(email);

      expect(result.summary).toBe('Test summary');
      expect(result.actionItems).toEqual(['Action 1', 'Action 2']);
      expect(mockProvider.callLLM).toHaveBeenCalledTimes(1);
    });

    it('should handle LLM response with markdown code blocks', async () => {
      const email = createTestEmail();
      const llmResponse = '```json\n{"summary":"Test","actionItems":[]}\n```';

      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce(llmResponse);

      const result = await service.generateSummary(email);

      expect(result.summary).toBe('Test');
      expect(result.actionItems).toEqual([]);
    });

    it('should handle empty action items array', async () => {
      const email = createTestEmail();
      const llmResponse = JSON.stringify({
        summary: 'No action required',
        actionItems: [],
      });

      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce(llmResponse);

      const result = await service.generateSummary(email);

      expect(result.actionItems).toEqual([]);
    });

    it('should throw on null email', async () => {
      await expect(service.generateSummary(null as unknown as Email)).rejects.toThrow(
        'Email is required'
      );
    });

    it('should throw on malformed JSON response', async () => {
      const email = createTestEmail();
      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce('not valid json');

      await expect(service.generateSummary(email)).rejects.toThrow(
        'Failed to parse LLM response as JSON'
      );
    });

    it('should throw on invalid response schema (missing summary)', async () => {
      const email = createTestEmail();
      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce(JSON.stringify({ actionItems: [] }));

      await expect(service.generateSummary(email)).rejects.toThrow('string "summary" field');
    });

    it('should throw on invalid response schema (missing actionItems)', async () => {
      const email = createTestEmail();
      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce(JSON.stringify({ summary: 'Test' }));

      await expect(service.generateSummary(email)).rejects.toThrow('array "actionItems" field');
    });

    it('should throw on non-string action items', async () => {
      const email = createTestEmail();
      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce(
        JSON.stringify({ summary: 'Test', actionItems: [123] })
      );

      await expect(service.generateSummary(email)).rejects.toThrow('must be a string');
    });

    it('should throw on empty response', async () => {
      const email = createTestEmail();
      vi.mocked(mockProvider.callLLM).mockResolvedValueOnce('');

      await expect(service.generateSummary(email)).rejects.toThrow('Empty response');
    });

    it('should propagate LLM API errors', async () => {
      const email = createTestEmail();
      vi.mocked(mockProvider.callLLM).mockRejectedValueOnce(new Error('API timeout'));

      await expect(service.generateSummary(email)).rejects.toThrow('Failed to generate summary');
    });
  });

  describe('hasSummary', () => {
    it('should return true when summary exists', () => {
      const email = createTestEmail({ summary: '{"summary":"Test","actionItems":[]}' });
      expect(service.hasSummary(email)).toBe(true);
    });

    it('should return false when summary is undefined', () => {
      const email = createTestEmail();
      expect(service.hasSummary(email)).toBe(false);
    });

    it('should return false when summary is null', () => {
      const email = createTestEmail({ summary: null as unknown as undefined });
      expect(service.hasSummary(email)).toBe(false);
    });

    it('should return false when summary is empty string', () => {
      const email = createTestEmail({ summary: '' });
      expect(service.hasSummary(email)).toBe(false);
    });
  });

  describe('parseSummary', () => {
    it('should parse valid summary JSON', () => {
      const summaryJson = JSON.stringify({
        summary: 'Test summary',
        actionItems: ['Task 1', 'Task 2'],
      });

      const result = service.parseSummary(summaryJson);

      expect(result.summary).toBe('Test summary');
      expect(result.actionItems).toEqual(['Task 1', 'Task 2']);
    });

    it('should parse summary with empty action items', () => {
      const summaryJson = JSON.stringify({
        summary: 'Test summary',
        actionItems: [],
      });

      const result = service.parseSummary(summaryJson);

      expect(result.actionItems).toEqual([]);
    });

    it('should throw on invalid JSON', () => {
      expect(() => service.parseSummary('not json')).toThrow('Invalid summary format');
    });

    it('should throw on empty string', () => {
      expect(() => service.parseSummary('')).toThrow('Summary JSON is required');
    });

    it('should throw on missing summary field', () => {
      expect(() => service.parseSummary(JSON.stringify({ actionItems: [] }))).toThrow(
        'string "summary" field'
      );
    });

    it('should throw on missing actionItems field', () => {
      expect(() => service.parseSummary(JSON.stringify({ summary: 'Test' }))).toThrow(
        'array "actionItems" field'
      );
    });
  });
});
