import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import App from '../../src/app';

// Note: App already uses MockEmailService by default currently
// We just need to verify the full flow

describe('US1 Integration: Inbox Flow', () => {
    it('should allow user to browse inbox and view details', async () => {
        const { lastFrame, stdin } = render(<App />);

        // 1. Check loading state
        expect(lastFrame()).toContain('Loading emails...');

        // 2. Wait for emails to load (MockEmailService is fast but useGmail is async)
        await new Promise(resolve => setTimeout(resolve, 50));

        // 3. Verify list rendering (MockEmailService generates 20 emails by default)
        expect(lastFrame()).toContain('Gmail Sweep');
        expect(lastFrame()).toContain('Select an email to view details');

        // 4. Navigate down to the second email
        stdin.write('\u001B[B');
        await new Promise(resolve => setTimeout(resolve, 50));

        // 5. Select the second email
        stdin.write('\r');
        await new Promise(resolve => setTimeout(resolve, 50));

        // 6. Verify details pane updated
        // MockEmailService format: From: senderX@example.com
        // Let's check for the presence of a sender or subject from the second item
        const frame = lastFrame();
        expect(frame).not.toContain('Select an email to view details');
        expect(frame).toContain('From:');
        expect(frame).toContain('Date:');
    });
});
