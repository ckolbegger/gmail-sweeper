import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EmailDetail } from '../../src/components/Inbox/EmailDetail';
import { AiProvider } from '../../src/services/ai/provider';
import { ISummaryStorage } from '../../src/services/storage/summaryStore';
import { Email } from '../../src/types';

describe('Summary Flow Integration', () => {
    let mockAiProvider: AiProvider;
    let mockStorage: ISummaryStorage;
    let mockEmail: Email;

    beforeEach(() => {
        mockEmail = {
            id: 'test-email-1',
            threadId: 'thread-1',
            from: 'Sender <sender@example.com>',
            to: 'Me <me@example.com>',
            subject: 'Test Subject',
            date: '2026-03-07T10:00:00Z',
            snippet: 'Test snippet',
            body: 'Hello, this is a test email body that should be summarized.',
            isUnread: false,
            internalDate: '123456',
            labelIds: ['INBOX']
        };

        mockAiProvider = {
            classifyEmails: vi.fn(),
            summarizeEmail: vi.fn().mockResolvedValue({
                summary: {
                    emailId: 'test-email-1',
                    description: 'This is a mock summary description.',
                    actionItems: ['Mock action 1', 'Mock action 2'],
                    createdAt: '2026-03-07T10:05:00Z'
                }
            })
        } as any;

        mockStorage = {
            getSummary: vi.fn().mockResolvedValue(null),
            saveSummary: vi.fn().mockResolvedValue(undefined)
        };
    });

    it('should generate and display a new summary when pressing s', async () => {
        const onBack = vi.fn();
        const { stdin, lastFrame, findByText } = render(
            <EmailDetail
                email={mockEmail}
                isActive={true}
                terminalWidth={100}
                terminalHeight={24}
                onBack={onBack}
                aiProvider={mockAiProvider}
                summaryStorage={mockStorage}
            />
        );

        // Initially shows the email body
        expect(lastFrame()).toContain('Hello, this is a test email body');

        // Press 's' to trigger summary
        stdin.write('s');

        // Wait for LLM to be called
        await vi.waitFor(() => {
            expect(mockAiProvider.summarizeEmail).toHaveBeenCalledWith({
                emailId: mockEmail.id,
                content: mockEmail.body
            });
        });

        // Let React state update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Summary should be displayed
        const frame = lastFrame();
        expect(frame).toContain('This is a mock summary description.');
        expect(frame).toContain('Mock action 1');
        expect(frame).toContain('Mock action 2');

        // Storage should be updated
        expect(mockStorage.saveSummary).toHaveBeenCalled();

        // Press 's' to toggle back
        stdin.write('s');
        
        // Let React state update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Original content should be displayed again
        const nextFrame = lastFrame();
        expect(nextFrame).toContain('Hello, this is a test email body');
    });
});
