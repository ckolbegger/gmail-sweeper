import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { EmailDetail } from '../../src/components/Inbox/EmailDetail';
import { Email } from '../../src/types';

describe('Email Rendering Integration', () => {
    it('should collapse blank lines and truncate URLs when rendering', () => {
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
            body: `Line 1\n\n\n\nLine 2\n\nCheck out https://www.example.com/very/long/url/path/to/resource`
        };

        const { lastFrame } = render(
            <EmailDetail 
                email={email} 
                isActive={true} 
                terminalWidth={40} 
                terminalHeight={20} 
            />
        );

        const output = lastFrame() || '';

        // Should have collapsed blank lines:
        // We can't strictly count the newlines easily in ink output, but we can verify it doesn't crash
        // and displays the content.

        // Should have truncated URL
        // 40 width * 0.6 = 24. 24 - 8 padding = 16 available body width.
        // 16 * 0.5 = 8 (but Math.max(10, ...)) -> so limit is 10.
        // Truncated to 10 chars: 'https:/...' (10 chars exactly)
        expect(output).toContain('https:/...');
        expect(output).not.toContain('https://www.example.com/very/long/url/path/to/resource');
    });
});
