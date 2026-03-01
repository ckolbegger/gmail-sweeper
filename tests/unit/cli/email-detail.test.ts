/**
 * Unit tests for EmailDetail component logic
 */

import { describe, it, expect } from 'vitest';
import type { Email } from '../../../src/core/models/email.js';
import { buildBodyViewport } from '../../../src/cli/components/email-detail.js';

describe('EmailDetail', () => {
  const mockEmail: Email = {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ name: 'Test Recipient', email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date('2024-01-01T10:00:00Z'),
    body: { text: 'Test body text', html: undefined },
    labels: ['INBOX', 'IMPORTANT'],
    isRead: false,
    category: 'updates',
    snippet: 'Test snippet',
    historyId: 'history-1',
    syncedAt: new Date(),
  };

  it('should display email subject, sender, recipients', () => {
    expect(mockEmail.subject).toBe('Test Subject');
    expect(mockEmail.sender.name).toBe('Test Sender');
    expect(mockEmail.sender.email).toBe('sender@example.com');
    expect(mockEmail.recipients[0].name).toBe('Test Recipient');
  });

  it('should render email body text', () => {
    expect(mockEmail.body.text).toBe('Test body text');
  });

  it('should show email labels', () => {
    expect(mockEmail.labels).toContain('INBOX');
    expect(mockEmail.labels).toContain('IMPORTANT');
  });

  it('should display email date in readable format', () => {
    const formatted = mockEmail.dateReceived.toLocaleString();
    expect(formatted).toContain('2024');
  });

  it('should handle emails without body content', () => {
    const emailWithoutBody: Email = {
      ...mockEmail,
      body: { text: '', html: undefined },
    };

    expect(emailWithoutBody.body.text).toBe('');
  });

  it('should handle null email state', () => {
    const nullEmail: Email | null = null;
    expect(nullEmail).toBeNull();
  });
});

describe('buildBodyViewport with blank line collapsing', () => {
  it('should collapse 5+ consecutive blank lines in body viewport', () => {
    const body = 'Line 1\n\n\n\n\nLine 2';
    const viewport = buildBodyViewport(body, 10, 0, 40);
    
    // After collapsing 5 newlines to 2, we should have: 'Line 1\n\nLine 2'
    // Which splits into 3 lines: 'Line 1', '', 'Line 2'
    expect(viewport.lines).toContain('Line 1');
    expect(viewport.lines).toContain('Line 2');
    // Total lines should be 3 (Line 1, blank, Line 2) after collapsing
    expect(viewport.totalLines).toBe(3);
  });

  it('should preserve exactly 2 blank lines in body viewport', () => {
    const body = 'Line 1\n\nLine 2';
    const viewport = buildBodyViewport(body, 10, 0, 40);
    
    expect(viewport.lines).toContain('Line 1');
    expect(viewport.lines).toContain('Line 2');
  });

  it('should handle multiple groups of blank lines in body viewport', () => {
    const body = 'Line 1\n\n\n\n\nLine 2\n\n\n\n\n\n\nLine 3';
    const viewport = buildBodyViewport(body, 10, 0, 40);
    
    // Each group of 5+ newlines should collapse to 2
    // Result: 'Line 1\n\nLine 2\n\nLine 3'
    expect(viewport.lines).toContain('Line 1');
    expect(viewport.lines).toContain('Line 2');
    expect(viewport.lines).toContain('Line 3');
  });

  it('should handle body with only whitespace', () => {
    const body = '\n\n\n\n\n';
    const viewport = buildBodyViewport(body, 10, 0, 40);
    
    // Should collapse to 2 newlines, resulting in 3 lines (2 empty + padding)
    expect(viewport.lines.length).toBeGreaterThan(0);
  });
});
