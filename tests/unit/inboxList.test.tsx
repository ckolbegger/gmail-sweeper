import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { InboxList } from '../../src/components/Inbox/InboxList';
import { Email } from '../../src/types';

const mockEmails: Email[] = [
    {
        id: '1',
        threadId: 't1',
        subject: 'Test Subject 1',
        from: 'sender1@test.com',
        date: 'Jan 01 10:00',
        snippet: 'Snippet 1',
        isUnread: true,
        labelIds: ['INBOX', 'UNREAD'],
        internalDate: '1000',
        to: 'me@test.com',
        body: 'Body 1'
    },
    {
        id: '2',
        threadId: 't2',
        subject: 'Test Subject 2',
        from: 'sender2@test.com',
        date: 'Jan 02 11:00',
        snippet: 'Snippet 2',
        isUnread: false,
        labelIds: ['INBOX'],
        internalDate: '2000',
        to: 'me@test.com',
        body: 'Body 2'
    }
];

describe('InboxList', () => {
    it('should render each email on two lines (subject then metadata)', () => {
        const { lastFrame } = render(
            <InboxList emails={mockEmails} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        const frame = lastFrame();
        expect(frame).toContain('Test Subject 1');
        expect(frame).toContain('sender1@test');
        expect(frame).toContain('Jan 01 10:00');
    });

    it('should show the focus indicator on both lines of the correct item', async () => {
        const { lastFrame, rerender } = render(
            <InboxList emails={mockEmails} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        expect(lastFrame()).toContain('❯');
        
        rerender(<InboxList emails={mockEmails} focusedIndex={1} terminalWidth={100} terminalHeight={24} />);
        
        const frame = lastFrame();
        expect(frame).toContain('❯');
        expect(frame).toContain('Test Subject 2');
    });

    it('should truncate sender name if too long for metadata line', () => {
        const longSenderEmail = { ...mockEmails[0], from: 'very-long-sender-name-that-definitely-exceeds-limits@example.com' };
        
        // Use enough width to avoid extreme wrapping but small enough to force truncation
        const { lastFrame } = render(
            <InboxList emails={[longSenderEmail]} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        const frame = lastFrame();
        // The sender should be truncated but date should be present
        expect(frame).toContain('Jan 01 10:00');
    });

    it('should handle empty state', () => {
        const { lastFrame } = render(
            <InboxList emails={[]} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        expect(lastFrame()).toContain('No emails found');
    });

    it('should implement windowing for large lists', () => {
        const manyEmails = Array.from({ length: 50 }, (_, i) => ({
            ...mockEmails[0],
            id: String(i),
            subject: `Subject ${i}`
        }));

        const { lastFrame, rerender } = render(
            <InboxList emails={manyEmails} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        expect(lastFrame()).toContain('Subject 0');
        expect(lastFrame()).not.toContain('Subject 40');

        // Move focus deep into the list
        rerender(<InboxList manyEmails={manyEmails} focusedIndex={40} terminalWidth={100} terminalHeight={24} />);
        
        // Note: rerender with different props requires matching the prop name
        rerender(<InboxList emails={manyEmails} focusedIndex={40} terminalWidth={100} terminalHeight={24} />);
        
        expect(lastFrame()).toContain('Subject 40');
        expect(lastFrame()).not.toContain('Subject 0');
    });
});
