import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt } from '@/core/ai/prompt.js';
import type { EmailMetadata } from '@/core/ai/provider.js';

describe('buildClassificationPrompt', () => {
  it('builds user prompt with filter description', () => {
    const emails: EmailMetadata[] = [
      {
        id: 'msg-1',
        subject: 'Test Subject',
        senderName: 'Sender',
        senderEmail: 'sender@example.com',
        snippet: 'Test snippet',
      },
    ];

    const result = buildClassificationPrompt('financial offers', emails);

    expect(result.user).toContain('financial offers');
  });

  it('builds user prompt with email metadata array including id, subject, senderName, senderEmail, snippet', () => {
    const emails: EmailMetadata[] = [
      {
        id: 'msg-1',
        subject: 'Investment Opportunity',
        senderName: 'Finance Broker',
        senderEmail: 'broker@finance.com',
        snippet: 'Double your money in 30 days...',
      },
      {
        id: 'msg-2',
        subject: 'Newsletter',
        senderName: 'News Team',
        senderEmail: 'news@example.com',
        snippet: 'Weekly updates',
      },
    ];

    const result = buildClassificationPrompt('spam', emails);

    expect(result.user).toContain('msg-1');
    expect(result.user).toContain('Investment Opportunity');
    expect(result.user).toContain('broker@finance.com');
    expect(result.user).toContain('Double your money in 30 days...');
    expect(result.user).toContain('msg-2');
    expect(result.user).toContain('Newsletter');
    expect(result.user).toContain('news@example.com');
    expect(result.user).toContain('Weekly updates');
  });

  it('system prompt includes instruction for JSON output format', () => {
    const emails: EmailMetadata[] = [];
    const result = buildClassificationPrompt('test filter', emails);

    expect(result.system).toContain('JSON');
    expect(result.system).toContain('array');
    expect(result.system).toContain('emailId');
  });

  it('handles empty email list gracefully', () => {
    const emails: EmailMetadata[] = [];
    const result = buildClassificationPrompt('test filter', emails);

    expect(result.user).toBeDefined();
    expect(result.system).toBeDefined();
    expect(result.user).toContain('[]');
  });

  it('handles emails with snippet field', () => {
    const emails: EmailMetadata[] = [
      {
        id: 'msg-with-snippet',
        subject: 'Email With Snippet',
        senderName: 'Test Sender',
        senderEmail: 'test@example.com',
        snippet: 'This is the email snippet',
      },
    ];

    const result = buildClassificationPrompt('filter', emails);

    expect(result.user).toContain('msg-with-snippet');
    expect(result.user).toContain('Email With Snippet');
    expect(result.user).toContain('test@example.com');
    expect(result.user).toContain('This is the email snippet');
  });

  it('prompt includes expected structure for AI to follow', () => {
    const emails: EmailMetadata[] = [
      {
        id: 'msg-1',
        subject: 'Test',
        senderName: 'Test User',
        senderEmail: 'test@example.com',
        snippet: 'Test snippet',
      },
    ];

    const result = buildClassificationPrompt('promotional emails', emails);

    // System prompt should explain the classification task
    expect(result.system).toBeDefined();
    expect(result.system.length).toBeGreaterThan(0);

    // User prompt should contain the filter description
    expect(result.user).toContain('promotional emails');

    // User prompt should contain email data
    expect(result.user).toContain('msg-1');
  });
});
