import { describe, it, expect } from 'vitest';
import { buildSummaryPrompt } from '@/core/ai/summary-prompt.js';
import type { Email } from '@/core/models/email.js';

function createTestEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'test-1',
    threadId: 'thread-1',
    subject: 'Meeting Tomorrow',
    sender: { name: 'John Doe', email: 'john@example.com' },
    recipients: [{ email: 'jane@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-15T10:00:00Z'),
    body: { text: "Let's meet at 2pm to discuss the Q4 budget." },
    labels: [],
    isRead: true,
    snippet: 'Meeting snippet',
    historyId: '123',
    syncedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('buildSummaryPrompt', () => {
  it('should generate system and user prompts', () => {
    const email = createTestEmail();
    const prompt = buildSummaryPrompt(email);

    expect(prompt.system).toBeDefined();
    expect(prompt.user).toBeDefined();
    expect(prompt.system).toContain('email summarizer');
    expect(prompt.system).toContain('JSON');
  });

  it('should include email subject in user prompt', () => {
    const email = createTestEmail({ subject: 'Important Project Update' });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain('Important Project Update');
  });

  it('should include sender name in user prompt', () => {
    const email = createTestEmail({
      sender: { name: 'Alice Smith', email: 'alice@example.com' },
    });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain('Alice Smith');
  });

  it('should fall back to sender email if no name', () => {
    const email = createTestEmail({
      sender: { email: 'bob@example.com' },
    });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain('bob@example.com');
  });

  it('should include email body text in user prompt', () => {
    const email = createTestEmail({
      body: { text: 'Please review the attached document by Friday.' },
    });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain('Please review the attached document by Friday.');
  });

  it('should fall back to snippet if no body text', () => {
    const email = createTestEmail({
      body: { text: '' },
      snippet: 'This is a preview of the email',
    });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain('This is a preview of the email');
  });

  it('should include date in user prompt', () => {
    const email = createTestEmail({
      dateReceived: new Date('2024-03-15'),
    });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain('2024');
  });

  it('should instruct JSON format with summary and actionItems', () => {
    const email = createTestEmail();
    const prompt = buildSummaryPrompt(email);

    expect(prompt.system).toContain('summary');
    expect(prompt.system).toContain('actionItems');
  });

  it('should handle empty body gracefully', () => {
    const email = createTestEmail({
      body: { text: '' },
      snippet: '',
    });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain('No content');
  });

  it('should include guidelines for one-sentence summary', () => {
    const email = createTestEmail();
    const prompt = buildSummaryPrompt(email);

    expect(prompt.system).toContain('one clear sentence');
  });

  it('should include instruction for extracting action items', () => {
    const email = createTestEmail();
    const prompt = buildSummaryPrompt(email);

    expect(prompt.system).toContain('action items');
  });

  it('should handle long email body', () => {
    const longBody = 'A'.repeat(10000);
    const email = createTestEmail({
      body: { text: longBody },
    });
    const prompt = buildSummaryPrompt(email);

    expect(prompt.user).toContain(longBody);
  });
});
