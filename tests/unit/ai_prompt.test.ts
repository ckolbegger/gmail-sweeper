import { describe, expect, it } from 'vitest';

import { buildClassificationPrompt } from '@/adapters/ai/prompt.js';

describe('classification prompt template', () => {
  it('should build prompt with filter description and email metadata array', () => {
    const prompt = buildClassificationPrompt('newsletters about investing', [
      {
        messageId: 'msg-1',
        subject: 'Weekly Market Update',
        sender: 'news@example.com',
        snippet: 'Top stories in markets today'
      }
    ]);

    expect(prompt.user).toContain('newsletters about investing');
    expect(prompt.user).toContain('msg-1');
    expect(prompt.user).toContain('Weekly Market Update');
  });

  it('should include system instruction for JSON output', () => {
    const prompt = buildClassificationPrompt('receipts', []);

    expect(prompt.system).toContain('JSON');
    expect(prompt.system).toContain('emailId');
    expect(prompt.system).toContain('matches');
    expect(prompt.system).toContain('confidence');
  });

  it('should handle empty email list', () => {
    const prompt = buildClassificationPrompt('receipts', []);

    expect(prompt.user).toContain('[]');
  });
});
