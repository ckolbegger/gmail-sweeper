/**
 * T010: Unit tests for classification prompt template
 * Test: builds prompt with filter description and email metadata array,
 * output includes system instruction for JSON format, handles empty email list
 */

import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt, buildSummaryPrompt } from '../../../src/core/ai/prompt.js';
import type { EmailMetadata } from '../../../src/core/ai/provider.js';

describe('buildClassificationPrompt', () => {
  const emails: EmailMetadata[] = [
    {
      id: '1',
      subject: 'Newsletter about investing',
      sender: 'newsletter@example.com',
      snippet: 'Weekly update on markets',
    },
    {
      id: '2',
      subject: 'Dinner plans',
      sender: 'friend@example.com',
      snippet: 'Want to grab food?',
    },
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

describe('buildSummaryPrompt', () => {
  it('should include subject, sender, and body in prompt', () => {
    const result = buildSummaryPrompt({
      id: '1',
      subject: 'Meeting Request',
      sender: 'alice@example.com',
      body: 'Hi, can we schedule a meeting?',
    });

    expect(result).toContain('Meeting Request');
    expect(result).toContain('alice@example.com');
    expect(result).toContain('Hi, can we schedule a meeting?');
  });

  it('should include system prompt for JSON format', () => {
    const result = buildSummaryPrompt({
      id: '1',
      subject: 'Test',
      sender: 'test@example.com',
      body: 'Body content',
    });

    expect(result).toContain('JSON');
    expect(result).toContain('summary');
    expect(result).toContain('action_items');
  });

  it('should specify one sentence summary requirement', () => {
    const result = buildSummaryPrompt({
      id: '1',
      subject: 'Test',
      sender: 'test@example.com',
      body: 'Body content',
    });

    expect(result).toContain('one sentence');
  });

  it('should specify timestamp in ISO format', () => {
    const result = buildSummaryPrompt({
      id: '1',
      subject: 'Test',
      sender: 'test@example.com',
      body: 'Body content',
    });

    expect(result).toContain('ISO');
    expect(result).toContain('generated_at');
  });

  it('should handle empty body', () => {
    const result = buildSummaryPrompt({
      id: '1',
      subject: 'Test',
      sender: 'test@example.com',
      body: '',
    });

    expect(result).toContain('Test');
    expect(result).toContain('test@example.com');
    expect(result).toContain('JSON');
  });
});
