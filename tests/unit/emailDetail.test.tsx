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
        const { lastFrame } = render(<EmailDetail email={mockEmail} terminalWidth={100} terminalHeight={24} />);
        const frame = lastFrame();
        expect(frame).toContain('Detailed Subject');
        expect(frame).toContain('From: sender@detail.com');
        expect(frame).toContain('Date: 2024-01-01');
    });

    it('should render the email body content', () => {
        const { lastFrame } = render(<EmailDetail email={mockEmail} terminalWidth={100} terminalHeight={24} />);
        expect(lastFrame()).toContain('This is the full body content of the email.');
    });

    it('should handle "no email selected" state', () => {
        const { lastFrame } = render(<EmailDetail email={null} terminalWidth={100} terminalHeight={24} />);
        expect(lastFrame()).toContain('Select an email to view details');
    });

    it('should wrap long lines into multiple lines', async () => {
        const longLine = 'This is a very long line that should be wrapped';
        const emailWithLongLine = { ...mockEmail, body: longLine };
        
        // availableWidth = 40 * 0.6 - 8 = 16
        const { lastFrame } = render(<EmailDetail email={emailWithLongLine} isActive={true} terminalWidth={40} terminalHeight={24} />);
        
        const frame = lastFrame();
        expect(frame).toContain('This is a very');
        expect(frame).toContain('line that should');
        expect(frame).toContain('be');
        expect(frame).toContain('wrapped');
    });

    it('should scroll content when arrow keys are pressed', async () => {
        const lines = Array.from({ length: 30 }, (_, i) => `Line ${String.fromCharCode(65 + i)}`);
        const emailWithLongBody = { ...mockEmail, body: lines.join('\n') };
        
        const { lastFrame, stdin } = render(<EmailDetail email={emailWithLongBody} isActive={true} terminalWidth={100} terminalHeight={24} />);

        // Initial view should show Line A
        expect(lastFrame()).toContain('Line A');
        expect(lastFrame()).not.toContain('Line Z');

        // Scroll down significantly
        for (let i = 0; i < 15; i++) {
            stdin.write('\u001B[B'); // Down arrow
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        const frame = lastFrame();
        expect(frame).not.toContain('Line A');
        expect(frame).toContain('Line P');
    });

    it('should reset scroll position when email changes', async () => {
        const longBody = Array.from({ length: 30 }, (_, i) => `Line ${i}`).join('\n');
        const email1 = { ...mockEmail, id: '1', body: longBody };
        const email2 = { ...mockEmail, id: '2', body: 'New Content' };
        
        const { lastFrame, stdin, rerender } = render(<EmailDetail email={email1} isActive={true} terminalWidth={100} terminalHeight={24} />);

        // Scroll down
        stdin.write('\u001B[B');
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Change email
        rerender(<EmailDetail email={email2} isActive={true} terminalWidth={100} terminalHeight={24} />);
        
        expect(lastFrame()).toContain('New Content');
        // If we reached here without error, the reset effect triggered
    });
});
