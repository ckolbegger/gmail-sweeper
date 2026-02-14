import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { useGmail } from '../../src/hooks/useGmail';
import { IEmailService } from '../../src/types/interfaces';

const mockEmails: any = [{ id: '1', subject: 'Test' }];

const createMockService = (emails: any = mockEmails): IEmailService => ({
    listEmails: vi.fn().mockResolvedValue({ items: emails, nextPageToken: undefined }),
    getEmail: vi.fn().mockResolvedValue(emails[0]),
    isAuthenticated: vi.fn().mockResolvedValue(true),
    authenticate: vi.fn().mockResolvedValue(undefined)
});

describe('useGmail', () => {
    it('should fetch data on mount', async () => {
        const service = createMockService();
        let results: any = null;

        const TestComponent = () => {
            const { emails, loading } = useGmail(service);
            results = { emails, loading };
            return null;
        };

        render(<TestComponent />);

        // Wait for fetch
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(service.isAuthenticated).toHaveBeenCalled();
        expect(service.listEmails).toHaveBeenCalled();
        expect(results.emails).toEqual(mockEmails);
        expect(results.loading).toBe(false);
    });

    it('should handle loading state', async () => {
        const service = createMockService();
        let loadingState: boolean | undefined;

        const TestComponent = () => {
            const { loading } = useGmail(service);
            loadingState = loading;
            return null;
        };

        render(<TestComponent />);
        expect(loadingState).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 100));
        expect(loadingState).toBe(false);
    });

    it('should handle error state', async () => {
        const service = createMockService();
        (service.listEmails as any).mockRejectedValue(new Error('Fetch failed'));
        let errorResult: any = null;

        const TestComponent = () => {
            const { error } = useGmail(service);
            errorResult = error;
            return null;
        };

        render(<TestComponent />);
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(errorResult).toBe('Fetch failed');
    });

    it('should expose refetch capability', async () => {
        const service = createMockService();
        let refetchFn: any = null;

        const TestComponent = () => {
            const { refetch } = useGmail(service);
            refetchFn = refetch;
            return null;
        };

        render(<TestComponent />);
        await new Promise(resolve => setTimeout(resolve, 100));

        vi.clearAllMocks();
        await refetchFn();
        expect(service.listEmails).toHaveBeenCalled();
    });
});
