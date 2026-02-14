import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/app';
import { useGmail } from '../../src/hooks/useGmail';

vi.mock('../../src/hooks/useGmail');

const mockEmails = [
    { id: '1', subject: 'Subject 1', from: 'sender1', date: 'now', snippet: 'snip1', isUnread: true, body: 'body1' },
    { id: '2', subject: 'Subject 2', from: 'sender2', date: 'now', snippet: 'snip2', isUnread: false, body: 'body2' }
];

describe('App Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render loading state', () => {
        (useGmail as any).mockReturnValue({
            emails: [],
            loading: true,
            error: null,
            refetch: vi.fn()
        });

        const { lastFrame } = render(<App />);
        expect(lastFrame()).toContain('Loading emails (check browser for auth if needed)...');
    });

    it('should render error state', () => {
        (useGmail as any).mockReturnValue({
            emails: [],
            loading: false,
            error: 'Failed to load',
            refetch: vi.fn()
        });

        const { lastFrame } = render(<App />);
        expect(lastFrame()).toContain('Error: Failed to load');
    });

    it('should render InboxList and select email', async () => {
        (useGmail as any).mockReturnValue({
            emails: mockEmails,
            loading: false,
            error: null,
            refetch: vi.fn()
        });

        const { lastFrame, stdin } = render(<App />);

        expect(lastFrame()).toContain('Subject 1');
        expect(lastFrame()).toContain('Select an email');

        // Selection is handled by InboxList internally now
        stdin.write('\r');
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(lastFrame()).toContain('body1');
    });

    it('should respect limit prop', () => {
        (useGmail as any).mockReturnValue({ emails: [], loading: false, error: null, refetch: vi.fn() });
        render(<App limit={50} />);
        expect(useGmail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            maxResults: 50
        }));
    });
});
