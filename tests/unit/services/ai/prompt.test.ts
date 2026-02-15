import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt } from '../../../../src/services/ai/prompt';

describe('buildClassificationPrompt', () => {
  it('should include the filter description and email metadata', () => {
    const description = 'newsletters about investing';
    const emails = [
      { id: '1', subject: 'Investing Weekly', senderName: 'Alice', senderEmail: 'a@test.com', snippet: 'Top stocks to watch' }
    ];
    const prompt = buildClassificationPrompt(description, emails);
    
    expect(prompt).toContain(description);
    expect(prompt).toContain('Investing Weekly');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('JSON');
  });

  it('should handle empty email list', () => {
    const prompt = buildClassificationPrompt('test', []);
    expect(prompt).toBeDefined();
  });
});
