import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSummary } from '../../src/hooks/useSummary';
import { AiProvider } from '../../src/services/ai/provider';
import { ISummaryStorage } from '../../src/services/storage/summaryStore';
import { Email } from '../../src/types';

describe('useSummary hook', () => {
    let mockAiProvider: AiProvider;
    let mockStorage: ISummaryStorage;
    let mockEmail: Email;

    beforeEach(() => {
        mockEmail = { id: 'test-email-1', body: 'Test body content' } as any;

        mockAiProvider = {
            summarizeEmail: vi.fn().mockResolvedValue({
                summary: {
                    emailId: 'test-email-1',
                    description: 'Mock desc',
                    actionItems: ['Task 1'],
                    createdAt: '2026-03-07T10:05:00Z'
                }
            })
        } as any;

        mockStorage = {
            getSummary: vi.fn().mockResolvedValue(null),
            saveSummary: vi.fn().mockResolvedValue(undefined)
        };
    });

    it('should generate summary using AiProvider', async () => {
        let results: any = null;
        let generateFn: any = null;

        const TestComponent = () => {
            const hook = useSummary(mockAiProvider, mockStorage, mockEmail);
            results = hook;
            generateFn = hook.generateSummary;
            return null;
        };

        render(<TestComponent />);

        expect(results.summary).toBeNull();
        expect(results.isSummarizing).toBe(false);
        expect(results.error).toBeNull();

        await generateFn();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(results.isSummarizing).toBe(false);
        expect(results.error).toBeNull();
        expect(results.summary).toEqual({
            emailId: 'test-email-1',
            description: 'Mock desc',
            actionItems: ['Task 1'],
            createdAt: '2026-03-07T10:05:00Z'
        });

        expect(mockAiProvider.summarizeEmail).toHaveBeenCalledWith({
            emailId: 'test-email-1',
            content: 'Test body content'
        });
        expect(mockStorage.saveSummary).toHaveBeenCalledWith({
            emailId: 'test-email-1',
            description: 'Mock desc',
            actionItems: ['Task 1'],
            createdAt: '2026-03-07T10:05:00Z'
        });
    });

    it('should handle AI provider errors', async () => {
        const mockError = new Error('LLM failed');
        mockAiProvider.summarizeEmail = vi.fn().mockRejectedValue(mockError);

        let results: any = null;
        let generateFn: any = null;

        const TestComponent = () => {
            const hook = useSummary(mockAiProvider, mockStorage, mockEmail);
            results = hook;
            generateFn = hook.generateSummary;
            return null;
        };

        render(<TestComponent />);

        await generateFn();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(results.isSummarizing).toBe(false);
        expect(results.error).toBe('LLM failed');
        expect(results.summary).toBeNull();
    });

    it('should prevent concurrent API calls when already summarizing', async () => {
        let results: any = null;
        let generateFn: any = null;

        // Make the mock promise not resolve immediately so we can trigger the concurrent call
        let resolvePromise: any;
        const delayedPromise = new Promise(resolve => {
            resolvePromise = resolve;
        });

        mockAiProvider.summarizeEmail = vi.fn().mockImplementation(() => delayedPromise);

        const TestComponent = () => {
            const hook = useSummary(mockAiProvider, mockStorage, mockEmail);
            results = hook;
            generateFn = hook.generateSummary;
            return null;
        };

        render(<TestComponent />);

        // Call first time
        generateFn();

        await new Promise(resolve => setTimeout(resolve, 50));
        expect(results.isSummarizing).toBe(true);

        // Call second time while first is still pending
        generateFn();

        expect(mockAiProvider.summarizeEmail).toHaveBeenCalledTimes(1); // Should only be called once

        // Resolve the promise to clean up
        resolvePromise({
            summary: {
                emailId: 'test-email-1',
                description: 'Mock desc',
                actionItems: ['Task 1'],
                createdAt: '2026-03-07T10:05:00Z'
            }
        });
    });
});
