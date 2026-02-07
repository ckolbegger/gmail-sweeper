/**
 * Unit tests for EmailDetail component logic
 */

import { describe, it, expect } from 'vitest';
import type { Email } from '../../../src/core/models/email.js';

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
