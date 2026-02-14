import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import App from '../../src/app';
import { MockEmailService } from '../mocks/mockEmailService';

describe('US1 Integration: Inbox Flow', () => {
    it('should allow user to browse inbox and view details', async () => {
        const service = new MockEmailService();
        const { lastFrame, stdin } = render(<App service={service} />);

        // 1. Check loading state
        expect(lastFrame()).toContain('Loading emails (check browser for auth if needed)...');

        // 2. Wait for emails to load
        await new Promise(resolve => setTimeout(resolve, 200));

        // 3. Verify list rendering
        expect(lastFrame()).toContain('Gmail Sweep');
        expect(lastFrame()).toContain('Select an email to view details');

        // 4. Navigate down to the second email
        stdin.write('\u001B[B');
        await new Promise(resolve => setTimeout(resolve, 100));

        // 5. Select the second email
        stdin.write('\r');
        await new Promise(resolve => setTimeout(resolve, 100));

        // 6. Verify details pane updated
        const frame = lastFrame();
        expect(frame).not.toContain('Select an email to view details');
        expect(frame).toContain('From:');
        expect(frame).toContain('Mock Subject 1');
    });
});
