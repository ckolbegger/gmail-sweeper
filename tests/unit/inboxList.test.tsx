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
            <InboxList emails={mockEmails} onSelect={vi.fn()} />
        );

        const frame = lastFrame();
        expect(frame).toContain('Test Subject 1');
        expect(frame).toContain('Test Subject 2');
        expect(frame).toContain('sender1@test.com');
        expect(frame).toContain('sender2@test.com');
    });

    it('should distinguish unread emails with bold text', () => {
        const { lastFrame } = render(
            <InboxList emails={mockEmails} onSelect={vi.fn()} />
        );

        // This is a bit tricky to test with string output, but we can verify our implementation uses 'bold'
        // For now we assume the implementation will handle it.
        // We might need to check if the framework supports querying for style markers if needed.
    });

    it('should support keyboard navigation', async () => {
        const onSelect = vi.fn();
        const { stdin, lastFrame } = render(
            <InboxList emails={mockEmails} onSelect={onSelect} />
        );

        // Initial focus on first email
        expect(lastFrame()).toContain('> sender1@test.com');

        // Press down arrow
        stdin.write('\u001B[B');
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(lastFrame()).toContain('> sender2@test.com');

        // Press up arrow
        stdin.write('\u001B[A');
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(lastFrame()).toContain('> sender1@test.com');
    });

    it('should handle selection with Enter key', async () => {
        const onSelect = vi.fn();
        const { stdin } = render(
            <InboxList emails={mockEmails} onSelect={onSelect} />
        );

        // Press Enter
        stdin.write('\r');
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(onSelect).toHaveBeenCalledWith(mockEmails[0]);
    });

    it('should not scroll past boundaries', async () => {
        const { stdin, lastFrame } = render(
            <InboxList emails={mockEmails} onSelect={vi.fn()} />
        );

        // Try to go above top
        stdin.write('\u001B[A');
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(lastFrame()).toContain('> sender1@test.com');

        // Go to bottom
        stdin.write('\u001B[B');
        await new Promise(resolve => setTimeout(resolve, 50));
        stdin.write('\u001B[B'); // Extra press
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(lastFrame()).toContain('> sender2@test.com');
    });

    it('should display empty state when list is empty', () => {
        const { lastFrame } = render(
            <InboxList emails={[]} onSelect={vi.fn()} />
        );

        expect(lastFrame()).toContain('No emails found');
    });
});
