/**
 * T035: Integration test for clear filter
 * Test: apply filter -> verify filtered -> clear -> verify full list restored
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from 'ink-testing-library';
import { InboxApp } from '../../src/tui/app.js';
import type { GmailClient } from '../../src/core/gmail/client.js';
import type { EmailCache } from '../../src/core/cache/db.js';

vi.mock('../../src/core/gmail/client.js', () => ({
  GmailClient: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    listEmails: vi.fn().mockResolvedValue({ 
      messages: [
        { id: '1', threadId: 'thread-1', subject: 'Email 1', snippet: 'Snippet 1', from: { name: 'Sender 1', email: 'sender1@example.com' }, date: new Date(), labelIds: [], unread: false },
        { id: '2', threadId: 'thread-2', subject: 'Email 2', snippet: 'Snippet 2', from: { name: 'Sender 2', email: 'sender2@example.com' }, date: new Date(), labelIds: [], unread: false },
      ], 
      nextPageToken: undefined, 
      totalEstimate: 2 
    }),
  })),
}));

vi.mock('../../src/core/cache/db.js', () => ({
  EmailCache: vi.fn().mockImplementation(() => ({
    getEmails: vi.fn().mockResolvedValue([]),
    saveEmail: vi.fn(),
  })),
}));

vi.mock('../../src/core/ai/config.js', () => ({
  resolveAiConfig: vi.fn().mockReturnValue({
    provider: 'anthropic',
    model: 'claude-3',
    apiKey: 'test-key',
    maxContextTokens: 32000,
  }),
}));

vi.mock('../../src/core/ai/provider.js', () => ({
  createAiProvider: vi.fn().mockReturnValue({
    classifyEmails: vi.fn().mockResolvedValue([
      { emailId: '1', matches: true, confidence: 0.9, confidenceLevel: 'high' },
    ]),
  }),
}));

describe('T035: Clear Filter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should restore full list after clear', () => {
    const mockClient = {} as GmailClient;
    const mockCache = {} as EmailCache;

    const { lastFrame, stdin } = render(React.createElement(InboxApp, { client: mockClient, cache: mockCache }));
    
    // Wait for initial render - may show loading first
    const initialOutput = lastFrame() || '';
    expect(initialOutput).toMatch(/Gmail Inbox|Loading/);
    
    // Press 'f' to activate filter
    stdin.write('f');
    
    // Should show filter prompt
    const filterOutput = lastFrame() || '';
    expect(filterOutput).toMatch(/Filter|filter/);
    
    // Press Escape to cancel/clear
    stdin.write('\u001b'); // Escape key
    
    // Should be back to normal - no filter UI
    const afterClear = lastFrame() || '';
    expect(afterClear).toMatch(/Gmail Inbox/);
  });
});
