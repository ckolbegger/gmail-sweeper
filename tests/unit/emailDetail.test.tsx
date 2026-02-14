import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { EmailDetail } from '../../src/components/Inbox/EmailDetail';
import { Email } from '../../src/types';

const mockEmail: Email = {
    id: '1',
    threadId: 't1',
    subject: 'Detailed Subject',
    from: 'sender@detail.com',
    date: '2024-01-01',
    snippet: 'Snippet',
    isUnread: true,
    labelIds: ['INBOX'],
    internalDate: '1000',
    to: 'me@test.com',
    body: 'This is the full body content of the email.'
};

describe('EmailDetail', () => {
    it('should render email subject, from, and date headers', () => {
        const { lastFrame } = render(<EmailDetail email={mockEmail} />);
        const frame = lastFrame();
        expect(frame).toContain('Detailed Subject');
        expect(frame).toContain('From: sender@detail.com');
        expect(frame).toContain('Date: 2024-01-01');
    });

    it('should render the email body content', () => {
        const { lastFrame } = render(<EmailDetail email={mockEmail} />);
        expect(lastFrame()).toContain('This is the full body content of the email.');
    });

    it('should handle "no email selected" state', () => {
        const { lastFrame } = render(<EmailDetail email={null} />);
        expect(lastFrame()).toContain('Select an email to view details');
    });

    it('should scroll content when active and arrow keys are pressed', async () => {
        const lines = Array.from({ length: 20 }, (_, i) => `Row ${String.fromCharCode(65 + i)}`);
        const longBody = lines.join('\n');
        const emailWithLongBody = { ...mockEmail, body: longBody };
        
        // WINDOW_HEIGHT is 15
        const { lastFrame, stdin } = render(<EmailDetail email={emailWithLongBody} isActive={true} />);

        // Initial view should show Row A
        expect(lastFrame()).toContain('Row A');
        expect(lastFrame()).not.toContain('Row Q');

        // Scroll down 5 times
        for (let i = 0; i < 5; i++) {
            stdin.write('\u001B[B'); // Down arrow
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        const frame = lastFrame();
        expect(frame).not.toContain('Row A'); // Row A should be scrolled out
        expect(frame).toContain('Row F');
        expect(frame).toContain('Row T');
    });
});
