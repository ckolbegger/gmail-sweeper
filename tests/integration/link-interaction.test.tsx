import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailDetail } from '../../src/components/Inbox/EmailDetail';
import { Email } from '../../src/types';
import open from 'open';
import clipboardy from 'clipboardy';

vi.mock('open');
vi.mock('clipboardy', () => ({
    default: {
        writeSync: vi.fn()
    }
}));

describe('Link Interaction Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should complete the full flow: select email, auto-focus link, tab to next, and open', async () => {
        const email: Email = {
            id: '1',
            threadId: '1',
            internalDate: '1000',
            labelIds: ['INBOX'],
            subject: 'Test Subject',
            from: 'test@example.com',
            snippet: 'Snippet',
            date: 'now',
            isUnread: false,
            body: `Line 1\nLink A: https://first.com\nLine 3\nLink B: https://second.com`
            };

            const { stdin, lastFrame } = render(
            <EmailDetail 
                email={email} 
                isActive={true} 
                terminalWidth={40} 
                terminalHeight={20} 
            />
            );

            await new Promise(resolve => setTimeout(resolve, 50));

            // Initial state: first link should be focused and cyan
            // But since ink-testing-library strips ansi colors in text (unless using a parser), 
            // we can test behavior instead.

            // Tab to second link
            stdin.write('\t');
            await new Promise(resolve => setTimeout(resolve, 50));

            // Open
            stdin.write('\r');
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(open).toHaveBeenCalledWith('https://second.com');

            // Copy
            stdin.write('c');
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(clipboardy.writeSync).toHaveBeenCalledWith('https://second.com');

            // Tab again, wraps to first
            stdin.write('\t');
            await new Promise(resolve => setTimeout(resolve, 50));
            stdin.write('\r');
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(open).toHaveBeenCalledWith('https://first.com');
            });
            });
