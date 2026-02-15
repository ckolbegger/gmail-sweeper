import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSmartFilter } from '../../../src/hooks/useSmartFilter';
import { runSmartFilter } from '../../../src/services/filter/smartFilter';

vi.mock('../../../src/services/filter/smartFilter');

describe('useSmartFilter', () => {
    const mockEmails: any = [{ id: '1', subject: 'Test', from: 'a@b.com', snippet: '...' }];
    const mockProvider: any = { classifyEmails: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    it('should initialize with idle status', async () => {
        let results: any = null;
        const TestComponent = () => {
            results = useSmartFilter(mockEmails, mockProvider);
            return null;
        };
        render(<TestComponent />);
        expect(results.status).toBe('idle');
        expect(results.results).toEqual([]);
    });

    it('should update status and results when applyFilter is called', async () => {
        vi.mocked(runSmartFilter).mockImplementation(() => {
            return new Promise(resolve => setTimeout(() => resolve({
                allResults: [],
                matchingResults: [{ emailId: '1', matches: true, confidence: 0.9 }],
                totalEvaluated: 1
            }), 50));
        });

        let results: any = null;
        const TestComponent = () => {
            results = useSmartFilter(mockEmails, mockProvider);
            return null;
        };
        render(<TestComponent />);

        // Call applyFilter
        const promise = results.applyFilter('test');
        
        // Wait for re-render
        await wait(20);
        expect(results.status).toBe('loading');

        await promise;
        await wait(20);

        expect(results.status).toBe('complete');
        expect(results.results).toHaveLength(1);
        expect(results.results[0].emailId).toBe('1');
    });

    it('should handle errors', async () => {
        vi.mocked(runSmartFilter).mockRejectedValue(new Error('Filter failed'));

        let results: any = null;
        const TestComponent = () => {
            results = useSmartFilter(mockEmails, mockProvider);
            return null;
        };
        render(<TestComponent />);

        try {
            await results.applyFilter('test');
        } catch (e) {
            // Expected
        }

        await wait(20);

        expect(results.status).toBe('error');
        expect(results.error).toBe('Filter failed');
    });

    it('should cancel previous filter when applyFilter is called again', async () => {
        let abortCalled = false;
        vi.mocked(runSmartFilter).mockImplementation(({ signal }) => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => resolve({ allResults: [], matchingResults: [], totalEvaluated: 0 }), 100);
                signal?.addEventListener('abort', () => {
                    abortCalled = true;
                    clearTimeout(timeout);
                    reject(new Error('Cancelled'));
                });
            });
        });

        let results: any = null;
        const TestComponent = () => {
            results = useSmartFilter(mockEmails, mockProvider);
            return null;
        };
        render(<TestComponent />);

        // Start first filter
        const p1 = results.applyFilter('first');
        await wait(10);
        
        // Start second filter immediately
        const p2 = results.applyFilter('second');

        await Promise.allSettled([p1, p2]);

        expect(abortCalled).toBe(true);
        expect(runSmartFilter).toHaveBeenCalledTimes(2);
    });
});
