import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/app';
import { MockEmailService } from '../mocks/mockEmailService';
import { AiProvider } from '../../src/services/ai/provider';
import * as aiConfig from '../../src/services/ai/config';
import * as aiProviderFactory from '../../src/services/ai/provider';

vi.mock('../../src/services/ai/config');
vi.mock('../../src/services/ai/provider', async () => {
    const actual = await vi.importActual('../../src/services/ai/provider');
    return {
        ...actual as any,
        createAiProvider: vi.fn()
    };
});

describe('Smart Filter Integration', () => {
    const mockEmails: any = [
        {
            id: '1',
            subject: 'Receipt 1',
            from: 'a@b.com',
            snippet: '...',
            internalDate: '1',
            body: '...',
            labelIds: ['INBOX'],
            to: 'me@test.com',
            date: 'now',
            isUnread: false
        },
        {
            id: '2',
            subject: 'Newsletter',
            from: 'c@d.com',
            snippet: '...',
            internalDate: '2',
            body: '...',
            labelIds: ['INBOX'],
            to: 'me@test.com',
            date: 'now',
            isUnread: false
        }
    ];

    const mockAiProvider: AiProvider = {
        classifyEmails: vi.fn().mockResolvedValue({
            results: [
                { emailId: '1', matches: true, confidence: 0.9 },
                { emailId: '2', matches: false, confidence: 0.1 }
            ]
        })
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(aiConfig.resolveAiConfig).mockReturnValue({
            provider: 'gemini',
            model: 'gemini-pro',
            apiKey: 'test-key'
        });
        vi.mocked(aiProviderFactory.createAiProvider).mockReturnValue(mockAiProvider);
    });

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    it('should allow user to filter emails by natural language', async () => {
        const service = new MockEmailService(mockEmails);
        const { lastFrame, stdin } = render(<App service={service} />);

        // 1. Wait for emails to load
        await wait(200);
        expect(lastFrame()).toContain('Receipt 1');
        expect(lastFrame()).toContain('Newsletter');

        // 2. Activate filter with 'f'
        stdin.write('f');
        await wait(200);
        expect(lastFrame()).toContain('Smart Filter:');

        // 3. Type description and submit
        stdin.write('receipts');
        await wait(100);
        stdin.write('\r');
        await wait(500); // Wait for evaluation

        // 4. Verify results
        const frame = lastFrame();
        expect(frame).toContain('Receipt 1');
        expect(frame).not.toContain('Newsletter');
        expect(frame).toContain('Filtered: 1/2');

        // 5. Press Escape to clear filter
        stdin.write('\x1B'); // \x1B is escape character
        await wait(200);

        // 6. Verify filter is cleared
        const finalFrame = lastFrame();
        expect(finalFrame).not.toContain('Filtered:');
        expect(finalFrame).toContain('Receipt 1');
        expect(finalFrame).toContain('Newsletter');
    });
});
