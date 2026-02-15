/**
 * T010: Unit tests for classification prompt template
 * Test: builds prompt with filter description and email metadata array,
 * output includes system instruction for JSON format, handles empty email list
 */

import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt, type EmailMetadata } from '../../../src/core/ai/prompt.js';

describe('buildClassificationPrompt', () => {
  const emails: EmailMetadata[] = [
    { id: '1', subject: 'Newsletter about investing', sender: 'newsletter@example.com', snippet: 'Weekly update on markets' },
    { id: '2', subject: 'Dinner plans', sender: 'friend@example.com', snippet: 'Want to grab food?' },
  ];

  it('should build prompt with filter description and email metadata', () => {
    const result = buildClassificationPrompt('newsletters about investing', emails);

    expect(result).toContain('newsletters about investing');
    expect(result).toContain('Newsletter about investing');
    expect(result).toContain('newsletter@example.com');
    expect(result).toContain('Weekly update on markets');
    expect(result).toContain('Dinner plans');
  });

  it('should include system instruction for JSON format', () => {
    const result = buildClassificationPrompt('test', emails);

    expect(result).toContain('JSON');
    expect(result).toContain('email_id');
    expect(result).toContain('matches');
    expect(result).toContain('confidence');
  });

  it('should handle empty email list', () => {
    const result = buildClassificationPrompt('test', []);

    expect(result).toContain('test');
    expect(result).toContain('JSON');
  });
});
