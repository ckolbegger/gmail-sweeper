import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSmartFilter } from '../../../src/hooks/useSmartFilter';
import { runSmartFilter } from '../../../src/services/filter/smartFilter';

vi.mock('../../../src/services/filter/smartFilter');

describe('useSmartFilter clearFilter', () => {
    const mockEmails: any = [{ id: '1', subject: 'Test', from: 'a@b.com', snippet: '...' }];
    const mockProvider: any = { classifyEmails: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    it('should reset status and results when clearFilter is called', async () => {
        vi.mocked(runSmartFilter).mockImplementation(() => {
            return new Promise(resolve => setTimeout(() => resolve({
                allResults: [],
                matchingResults: [{ emailId: '1', matches: true, confidence: 0.9 }],
                totalEvaluated: 1
            }), 10));
        });

        let results: any = null;
        const TestComponent = () => {
            results = useSmartFilter(mockEmails, mockProvider);
            return null;
        };
        render(<TestComponent />);

        // Call applyFilter and wait for completion
        const promise = results.applyFilter('test');
        await promise;
        await wait(20);

        // Verify it finished
        expect(results.status).toBe('complete');
        expect(results.results).toHaveLength(1);

        // Call clearFilter
        results.clearFilter();

        // Wait for re-render
        await wait(10);

        expect(results.status).toBe('idle');
        expect(results.results).toHaveLength(0);
        expect(results.error).toBe(null);
        expect(results.progress).toBe(null);
    });

    it('should abort ongoing filter when clearFilter is called', async () => {
        let abortCalled = false;
        vi.mocked(runSmartFilter).mockImplementation(({ signal }) => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => resolve({ allResults: [], matchingResults: [{ emailId: '1', matches: true, confidence: 1 }], totalEvaluated: 1 }), 100);
                if (signal) {
                    signal.addEventListener('abort', () => {
                        abortCalled = true;
                        clearTimeout(timeout);
                        const err = new Error('AbortError');
                        err.name = 'AbortError';
                        reject(err);
                    });
                }
            });
        });

        let results: any = null;
        const TestComponent = () => {
            results = useSmartFilter(mockEmails, mockProvider);
            return null;
        };
        render(<TestComponent />);

        // Start a filter
        const p1 = results.applyFilter('first');
        await wait(20);

        // Ensure it's loading
        expect(results.status).toBe('loading');

        // Call clearFilter
        results.clearFilter();

        // Await the rejected promise from runSmartFilter internally handling error
        try {
            await p1;
        } catch (e) { }

        await wait(20);

        expect(abortCalled).toBe(true);
        expect(results.status).toBe('idle');
        expect(results.results).toHaveLength(0);
        expect(results.error).toBe(null);
    });
});
