/**
 * T010: Unit tests for classification prompt template.
 *
 * Tests: buildSystemPrompt() and buildUserPrompt()
 * - System prompt enforces JSON output format
 * - User prompt includes filter description and email metadata
 * - Empty email list handled gracefully
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from '../../../src/core/ai/prompt.js';
import type { EmailMetadata } from '../../../src/core/ai/provider.js';

describe('buildSystemPrompt', () => {
  it('should return a non-empty string', () => {
    const result = buildSystemPrompt();
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should include JSON format instruction', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('JSON');
  });

  it('should include the expected output schema fields', () => {
    const result = buildSystemPrompt();
    expect(result).toContain('results');
    expect(result).toContain('emailId');
    expect(result).toContain('matches');
    expect(result).toContain('confidence');
    expect(result).toContain('reasoning');
  });
});

describe('buildUserPrompt', () => {
  const sampleEmails: EmailMetadata[] = [
    {
      id: 'msg-1',
      subject: 'Weekly newsletter',
      senderName: 'News Corp',
      senderEmail: 'news@example.com',
      snippet: 'This week in tech...',
    },
    {
      id: 'msg-2',
      subject: 'Meeting invite',
      senderName: 'Alice',
      senderEmail: 'alice@example.com',
      snippet: 'Can we meet on Thursday?',
    },
  ];

  it('should include the filter description', () => {
    const result = buildUserPrompt('Newsletters and promotions', sampleEmails);
    expect(result).toContain('Newsletters and promotions');
  });

  it('should include email metadata for each email', () => {
    const result = buildUserPrompt('Newsletters', sampleEmails);
    expect(result).toContain('msg-1');
    expect(result).toContain('Weekly newsletter');
    expect(result).toContain('News Corp');
    expect(result).toContain('news@example.com');
    expect(result).toContain('This week in tech...');
    expect(result).toContain('msg-2');
    expect(result).toContain('Meeting invite');
    expect(result).toContain('Alice');
    expect(result).toContain('alice@example.com');
  });

  it('should handle empty email list', () => {
    const result = buildUserPrompt('Newsletters', []);
    expect(result).toContain('Newsletters');
    expect(result).toBeTruthy();
  });
});
