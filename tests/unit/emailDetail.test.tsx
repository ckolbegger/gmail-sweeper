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
});