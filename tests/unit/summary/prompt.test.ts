/**
 * T003: Unit tests for buildSummaryPrompt and parseSummaryResponse.
 */

import { describe, it, expect } from 'vitest';
import { buildSummaryPrompt, parseSummaryResponse, SummaryGenerationError } from '../../../src/core/summary/prompt.js';
import type { Email } from '../../../src/core/models/index.js';

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Project Update',
    sender: { email: 'alice@example.com', name: 'Alice' },
    recipients: [{ email: 'bob@example.com', name: 'Bob' }],
    date: new Date('2026-03-07'),
    snippet: 'Short preview...',
    bodyText: 'Please review the attached proposal and reply by Friday.',
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
    ...overrides,
  };
}

describe('buildSummaryPrompt', () => {
  it('includes email subject in the prompt', () => {
    const email = makeEmail({ subject: 'Q1 Review Meeting' });
    const { user } = buildSummaryPrompt(email);
    expect(user).toContain('Q1 Review Meeting');
  });

  it('includes sender name and email in the prompt', () => {
    const email = makeEmail();
    const { user } = buildSummaryPrompt(email);
    expect(user).toContain('Alice');
    expect(user).toContain('alice@example.com');
  });

  it('includes body text in the prompt', () => {
    const email = makeEmail({ bodyText: 'Please review the proposal.' });
    const { user } = buildSummaryPrompt(email);
    expect(user).toContain('Please review the proposal.');
  });

  it('falls back to snippet when bodyText is absent', () => {
    const email = makeEmail({ bodyText: undefined, snippet: 'Snippet fallback.' });
    const { user } = buildSummaryPrompt(email);
    expect(user).toContain('Snippet fallback.');
  });

  it('returns a system prompt', () => {
    const email = makeEmail();
    const { system } = buildSummaryPrompt(email);
    expect(system).toBeTruthy();
    expect(typeof system).toBe('string');
  });
});

describe('parseSummaryResponse', () => {
  it('extracts one-sentence and action items from well-formed response', () => {
    const raw = 'This email is about a project update.\n\n- Review the proposal\n- Reply by Friday';
    const result = parseSummaryResponse(raw);
    expect(result.oneSentence).toBe('This email is about a project update.');
    expect(result.actionItems).toEqual(['Review the proposal', 'Reply by Friday']);
  });

  it('filters out "None" action item (case-insensitive)', () => {
    const raw = 'This is a newsletter.\n\n- None';
    const result = parseSummaryResponse(raw);
    expect(result.actionItems).toEqual([]);
  });

  it('filters out "none" in mixed case', () => {
    const raw = 'FYI email.\n\n- NONE';
    const result = parseSummaryResponse(raw);
    expect(result.actionItems).toEqual([]);
  });

  it('handles missing blank line gracefully — uses first line as sentence', () => {
    const raw = 'Summary sentence.\n- Action item one';
    const result = parseSummaryResponse(raw);
    expect(result.oneSentence).toBe('Summary sentence.');
    expect(result.actionItems).toEqual(['Action item one']);
  });

  it('returns empty actionItems when bullet list is absent', () => {
    const raw = 'Just a summary sentence.\n\n';
    const result = parseSummaryResponse(raw);
    expect(result.oneSentence).toBe('Just a summary sentence.');
    expect(result.actionItems).toEqual([]);
  });

  it('throws SummaryGenerationError when oneSentence is empty', () => {
    expect(() => parseSummaryResponse('')).toThrow(SummaryGenerationError);
    expect(() => parseSummaryResponse('   ')).toThrow(SummaryGenerationError);
  });
});
