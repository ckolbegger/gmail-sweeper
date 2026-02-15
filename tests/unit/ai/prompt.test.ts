import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt } from '../../../src/core/ai/prompt.js';

describe('buildClassificationPrompt', () => {
  it('should build prompt with filter description and email metadata array', () => {
    const filterDescription = 'newsletters about investing';
    const emails = [
      {
        id: 'email1',
        subject: 'Weekly Investment Newsletter',
        sender: { name: 'Investor Weekly', email: 'news@investorweekly.com' },
        snippet: 'This week in the markets...',
      },
      {
        id: 'email2',
        subject: 'Your Amazon Order',
        sender: { name: 'Amazon', email: 'orders@amazon.com' },
        snippet: 'Your order has shipped...',
      },
    ];

    const prompt = buildClassificationPrompt(filterDescription, emails);

    expect(prompt.system).toContain('JSON');
    expect(prompt.user).toContain(filterDescription);
    expect(prompt.user).toContain('email1');
    expect(prompt.user).toContain('email2');
    expect(prompt.user).toContain('Weekly Investment Newsletter');
    expect(prompt.user).toContain('Your Amazon Order');
  });

  it('should include system instruction for JSON format output', () => {
    const filterDescription = 'test filter';
    const emails = [
      { id: '1', subject: 'Test', sender: { email: 'test@test.com' }, snippet: 'Test snippet' },
    ];

    const prompt = buildClassificationPrompt(filterDescription, emails);

    expect(prompt.system).toContain('JSON');
    expect(prompt.system.toLowerCase()).toContain('json');
  });

  it('should handle empty email list', () => {
    const filterDescription = 'test filter';
    const emails: Array<{
      id: string;
      subject: string;
      sender: { name?: string; email: string };
      snippet: string;
    }> = [];

    const prompt = buildClassificationPrompt(filterDescription, emails);

    expect(prompt.system).toBeDefined();
    expect(prompt.user).toContain(filterDescription);
    expect(prompt.user).toContain('[]');
  });

  it('should include all required email metadata fields', () => {
    const filterDescription = 'find receipts';
    const emails = [
      {
        id: 'email123',
        subject: 'Your Receipt',
        sender: { name: 'Store', email: 'receipts@store.com' },
        snippet: 'Thank you for your purchase...',
      },
    ];

    const prompt = buildClassificationPrompt(filterDescription, emails);

    expect(prompt.user).toContain('email123');
    expect(prompt.user).toContain('Your Receipt');
    expect(prompt.user).toContain('Store');
    expect(prompt.user).toContain('receipts@store.com');
    expect(prompt.user).toContain('Thank you for your purchase');
  });

  it('should handle emails without sender name', () => {
    const filterDescription = 'test';
    const emails = [
      {
        id: 'email1',
        subject: 'Test Subject',
        sender: { email: 'sender@test.com' },
        snippet: 'Test snippet',
      },
    ];

    const prompt = buildClassificationPrompt(filterDescription, emails);

    expect(prompt.user).toContain('email1');
    expect(prompt.user).toContain('Test Subject');
    expect(prompt.user).toContain('sender@test.com');
  });
});
