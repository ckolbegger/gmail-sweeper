import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Box, Text } from 'ink';
import type { Email } from '../../src/core/contracts/types.js';
import type { AiProvider, EmailClassification } from '../../src/core/ai/provider.js';

function createTestEmail(overrides?: Partial<Email>): Email {
  return {
    id: `msg_${Math.random().toString(36).substring(2, 11)}`,
    threadId: `thread_${Math.random().toString(36).substring(2, 11)}`,
    subject: 'Test Subject',
    sender: { name: 'Test Sender', email: 'sender@example.com' },
    recipients: [{ name: 'Test Recipient', email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: 'Test body content' },
    labels: ['INBOX'],
    isRead: false,
    snippet: 'Test snippet...',
    historyId: '12345',
    syncedAt: new Date(),
    ...overrides,
  };
}

function createMockAiProvider(classifications: EmailClassification[] = []): AiProvider {
  return {
    classifyEmails: vi.fn().mockResolvedValue(classifications),
  };
}

interface TestComponentHandle {
  activateFilter: () => void;
  submitFilter: (description: string) => Promise<void>;
  clearFilter: () => void;
  getState: () => string;
  getFilteredEmails: () => Email[];
  getFilterCount: () => number;
}

interface SmartFilterTestComponentProps {
  emails: Email[];
  aiProvider: AiProvider;
  onStateChange?: (state: string) => void;
  onFilteredResults?: (results: Email[]) => void;
}

const SmartFilterTestComponent = React.forwardRef<
  TestComponentHandle,
  SmartFilterTestComponentProps
>(({ emails, aiProvider, onStateChange, onFilteredResults }, ref): React.ReactElement => {
  const [state, setState] = React.useState<'idle' | 'input' | 'loading' | 'filtered' | 'error'>(
    'idle'
  );
  const [filterDescription, setFilterDescription] = React.useState<string | undefined>();
  const [filteredEmails, setFilteredEmails] = React.useState<Email[]>([]);
  const [filterCount, setFilterCount] = React.useState(0);
  const [totalCount] = React.useState(emails.length);
  const [error, setError] = React.useState<Error | undefined>();

  const activateFilter = React.useCallback(() => {
    setState('input');
    onStateChange?.('input');
  }, [onStateChange]);

  const submitFilter = React.useCallback(
    async (description: string) => {
      setFilterDescription(description);
      setState('loading');
      onStateChange?.('loading');

      try {
        const classifications = await aiProvider.classifyEmails({
          filterDescription: description,
          emails: emails.map((e) => ({
            id: e.id,
            subject: e.subject,
            sender: e.sender,
            snippet: e.snippet,
          })),
        });

        const matched = emails.filter((email) => {
          const classification = classifications.find((c) => c.emailId === email.id);
          return classification?.matches ?? false;
        });

        setFilteredEmails(matched);
        setFilterCount(matched.length);
        setState('filtered');
        onStateChange?.('filtered');
        onFilteredResults?.(matched);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setState('error');
        onStateChange?.('error');
      }
    },
    [emails, aiProvider, onStateChange, onFilteredResults]
  );

  const clearFilter = React.useCallback(() => {
    setState('idle');
    setFilterDescription(undefined);
    setFilteredEmails([]);
    setFilterCount(0);
    setError(undefined);
    onStateChange?.('idle');
  }, [onStateChange]);

  React.useImperativeHandle(ref, () => ({
    activateFilter,
    submitFilter,
    clearFilter,
    getState: () => state,
    getFilteredEmails: () => filteredEmails,
    getFilterCount: () => filterCount,
  }));

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return React.createElement(
          Box,
          { flexDirection: 'column' },
          React.createElement(Text, null, `Inbox (${totalCount} emails)`),
          React.createElement(Text, null, ''),
          ...emails.map((email) =>
            React.createElement(Text, { key: email.id }, `- ${email.subject}`)
          ),
          React.createElement(Text, null, ''),
          React.createElement(Text, { dimColor: true }, 'Press f to filter')
        );

      case 'input':
        return React.createElement(
          Box,
          { flexDirection: 'column' },
          React.createElement(Text, null, 'Filter: '),
          React.createElement(Text, { dimColor: true }, 'Enter filter description and press Enter')
        );

      case 'loading':
        return React.createElement(
          Box,
          { flexDirection: 'column' },
          React.createElement(Text, null, `Filter: ${filterDescription}`),
          React.createElement(Text, null, 'Evaluating...')
        );

      case 'filtered':
        return React.createElement(
          Box,
          { flexDirection: 'column' },
          React.createElement(Text, null, `Filtered: ${filterCount}/${totalCount} emails`),
          React.createElement(Text, null, ''),
          ...(filteredEmails.length > 0
            ? filteredEmails.map((email) =>
                React.createElement(Text, { key: email.id }, `- ${email.subject}`)
              )
            : [React.createElement(Text, null, 'No matches found')]),
          React.createElement(Text, null, ''),
          React.createElement(Text, { dimColor: true }, 'Press Esc to clear filter')
        );

      case 'error':
        return React.createElement(
          Box,
          { flexDirection: 'column' },
          React.createElement(Text, { color: 'red' }, `Error: ${error?.message}`)
        );

      default:
        return React.createElement(Text, null, 'Unknown state');
    }
  };

  return renderContent();
});

SmartFilterTestComponent.displayName = 'SmartFilterTestComponent';

describe('Smart Filter Integration', () => {
  it('should complete full filter cycle: activate → input → loading → filtered', async () => {
    const matchingEmail = createTestEmail({
      id: 'msg_1',
      subject: 'Project meeting notes',
      body: { text: 'Discussion about Q4 project roadmap' },
    });
    const nonMatchingEmail = createTestEmail({
      id: 'msg_2',
      subject: 'Lunch plans',
      body: { text: 'Want to grab lunch tomorrow?' },
    });
    const emails = [matchingEmail, nonMatchingEmail];

    const mockProvider = createMockAiProvider([
      { emailId: 'msg_1', matches: true, confidence: 0.95 },
      { emailId: 'msg_2', matches: false, confidence: 0.1 },
    ]);

    const stateChanges: string[] = [];
    const filteredResults: Email[] = [];
    const componentRef = React.createRef<TestComponentHandle>();

    const { lastFrame } = render(
      React.createElement(SmartFilterTestComponent, {
        emails,
        aiProvider: mockProvider,
        ref: componentRef,
        onStateChange: (state) => stateChanges.push(state),
        onFilteredResults: (results) => filteredResults.push(...results),
      })
    );

    expect(lastFrame()).toContain('Inbox (2 emails)');
    expect(componentRef.current?.getState()).toBe('idle');

    componentRef.current?.activateFilter();
    expect(stateChanges).toContain('input');

    await componentRef.current?.submitFilter('project-related emails');
    expect(stateChanges).toContain('loading');
    expect(stateChanges).toContain('filtered');

    expect(filteredResults).toHaveLength(1);
    expect(filteredResults[0].id).toBe('msg_1');
    expect(componentRef.current?.getFilterCount()).toBe(1);
  });

  it('should hide non-matching emails in filtered view', async () => {
    const emails = [
      createTestEmail({
        id: 'msg_1',
        subject: 'Work: Budget review',
        body: { text: 'Q4 budget allocation' },
      }),
      createTestEmail({
        id: 'msg_2',
        subject: 'Personal: Vacation photos',
        body: { text: 'Check out my beach photos' },
      }),
      createTestEmail({
        id: 'msg_3',
        subject: 'Work: Team standup',
        body: { text: 'Daily standup notes' },
      }),
    ];

    const mockProvider = createMockAiProvider([
      { emailId: 'msg_1', matches: true, confidence: 0.9 },
      { emailId: 'msg_2', matches: false, confidence: 0.05 },
      { emailId: 'msg_3', matches: true, confidence: 0.85 },
    ]);

    const filteredResults: Email[] = [];
    const componentRef = React.createRef<TestComponentHandle>();

    render(
      React.createElement(SmartFilterTestComponent, {
        emails,
        aiProvider: mockProvider,
        ref: componentRef,
        onFilteredResults: (results) => filteredResults.push(...results),
      })
    );

    componentRef.current?.activateFilter();
    await componentRef.current?.submitFilter('work-related emails');

    expect(filteredResults).toHaveLength(2);
    expect(filteredResults.map((e) => e.id)).toEqual(['msg_1', 'msg_3']);
    expect(filteredResults.map((e) => e.id)).not.toContain('msg_2');
  });

  it('should display filtered count in format "Filtered: X/Y emails"', async () => {
    const emails = [
      createTestEmail({ id: 'msg_1', subject: 'Email 1' }),
      createTestEmail({ id: 'msg_2', subject: 'Email 2' }),
      createTestEmail({ id: 'msg_3', subject: 'Email 3' }),
      createTestEmail({ id: 'msg_4', subject: 'Email 4' }),
    ];

    const mockProvider = createMockAiProvider([
      { emailId: 'msg_1', matches: true, confidence: 0.9 },
      { emailId: 'msg_2', matches: true, confidence: 0.85 },
      { emailId: 'msg_3', matches: false, confidence: 0.2 },
      { emailId: 'msg_4', matches: false, confidence: 0.1 },
    ]);

    const componentRef = React.createRef<TestComponentHandle>();

    const { lastFrame } = render(
      React.createElement(SmartFilterTestComponent, {
        emails,
        aiProvider: mockProvider,
        ref: componentRef,
      })
    );

    componentRef.current?.activateFilter();
    await componentRef.current?.submitFilter('test filter');

    const output = lastFrame();
    expect(output).toContain('Filtered: 2/4 emails');
  });

  it('should display loading indicator while evaluating filter', async () => {
    const emails = [
      createTestEmail({ id: 'msg_1', subject: 'Email 1' }),
      createTestEmail({ id: 'msg_2', subject: 'Email 2' }),
    ];

    const mockProvider = {
      classifyEmails: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve([
                { emailId: 'msg_1', matches: true, confidence: 0.9 },
                { emailId: 'msg_2', matches: false, confidence: 0.1 },
              ]);
            }, 100);
          })
      ),
    };

    const stateChanges: string[] = [];
    const componentRef = React.createRef<TestComponentHandle>();

    const { lastFrame } = render(
      React.createElement(SmartFilterTestComponent, {
        emails,
        aiProvider: mockProvider,
        ref: componentRef,
        onStateChange: (state) => stateChanges.push(state),
      })
    );

    componentRef.current?.activateFilter();
    const submitPromise = componentRef.current?.submitFilter('test filter');

    expect(stateChanges).toContain('loading');
    expect(lastFrame()).toContain('Evaluating...');

    await submitPromise;
    expect(stateChanges).toContain('filtered');
  });

  it('should display "No matches found" when filter returns no results', async () => {
    const emails = [
      createTestEmail({ id: 'msg_1', subject: 'Email 1' }),
      createTestEmail({ id: 'msg_2', subject: 'Email 2' }),
    ];

    const mockProvider = createMockAiProvider([
      { emailId: 'msg_1', matches: false, confidence: 0.1 },
      { emailId: 'msg_2', matches: false, confidence: 0.05 },
    ]);

    const componentRef = React.createRef<TestComponentHandle>();

    const { lastFrame } = render(
      React.createElement(SmartFilterTestComponent, {
        emails,
        aiProvider: mockProvider,
        ref: componentRef,
      })
    );

    componentRef.current?.activateFilter();
    await componentRef.current?.submitFilter('nonexistent filter');

    const output = lastFrame();
    expect(output).toContain('Filtered: 0/2 emails');
    expect(output).toContain('No matches found');
  });

  it('should clear filter and restore full inbox view', async () => {
    const emails = [
      createTestEmail({ id: 'msg_1', subject: 'Email 1' }),
      createTestEmail({ id: 'msg_2', subject: 'Email 2' }),
    ];

    const mockProvider = createMockAiProvider([
      { emailId: 'msg_1', matches: true, confidence: 0.9 },
      { emailId: 'msg_2', matches: false, confidence: 0.1 },
    ]);

    const stateChanges: string[] = [];
    const componentRef = React.createRef<TestComponentHandle>();

    const { lastFrame } = render(
      React.createElement(SmartFilterTestComponent, {
        emails,
        aiProvider: mockProvider,
        ref: componentRef,
        onStateChange: (state) => stateChanges.push(state),
      })
    );

    componentRef.current?.activateFilter();
    await componentRef.current?.submitFilter('test filter');
    expect(stateChanges).toContain('filtered');

    componentRef.current?.clearFilter();
    expect(stateChanges).toContain('idle');

    const output = lastFrame();
    expect(output).toContain('Inbox (2 emails)');
    expect(componentRef.current?.getState()).toBe('idle');
  });

  it('should handle AI provider errors and show error message', async () => {
    const emails = [createTestEmail({ id: 'msg_1', subject: 'Email 1' })];

    const mockProvider = {
      classifyEmails: vi.fn().mockRejectedValue(new Error('API connection failed')),
    };

    const stateChanges: string[] = [];
    const componentRef = React.createRef<TestComponentHandle>();

    const { lastFrame } = render(
      React.createElement(SmartFilterTestComponent, {
        emails,
        aiProvider: mockProvider,
        ref: componentRef,
        onStateChange: (state) => stateChanges.push(state),
      })
    );

    componentRef.current?.activateFilter();
    await componentRef.current?.submitFilter('test filter');

    expect(stateChanges).toContain('error');
    const output = lastFrame();
    expect(output).toContain('Error: API connection failed');
  });
});
