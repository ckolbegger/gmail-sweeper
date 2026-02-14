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
        date: '2024-01-01',
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
        date: '2024-01-02',
        snippet: 'Snippet 2',
        isUnread: false,
        labelIds: ['INBOX'],
        internalDate: '2000',
        to: 'me@test.com',
        body: 'Body 2'
    }
];

describe('InboxList', () => {
    it('should render a list of emails', () => {
        const { lastFrame } = render(
            <InboxList emails={mockEmails} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        const frame = lastFrame();
        expect(frame).toContain('Test Subject 1');
        expect(frame).toContain('Test Subject 2');
        expect(frame).toContain('sender1@test');
    });

    it('should show the focus indicator on the correct item', async () => {
        const { lastFrame, rerender } = render(
            <InboxList emails={mockEmails} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        expect(lastFrame()).toContain('❯');
        expect(lastFrame()).toContain('sender1@test');

        rerender(<InboxList emails={mockEmails} focusedIndex={1} terminalWidth={100} terminalHeight={24} />);
        
        expect(lastFrame()).toContain('❯');
        expect(lastFrame()).toContain('sender2@test');
    });

    it('should display empty state when list is empty', () => {
        const { lastFrame } = render(
            <InboxList emails={[]} focusedIndex={0} terminalWidth={100} terminalHeight={24} />
        );

        expect(lastFrame()).toContain('No emails found');
    });
});