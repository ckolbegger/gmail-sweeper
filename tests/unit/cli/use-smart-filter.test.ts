/**
 * useSmartFilter Hook Tests
 *
 * Tests for the smart filter hook that manages filter state and evaluation.
 * Tests cover:
 * - Initial state is idle
 * - activateFilter sets input mode
 * - submitFilter triggers evaluation with loading state
 * - successful evaluation updates filtered results
 * - error preserves unfiltered view
 * - clearFilter restores idle state
 * - missing config shows error message (FR-017)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import type { Email } from '@/core/contracts/types.js';
import type { AiProvider, EmailClassification } from '@/core/ai/provider.js';
import { useSmartFilter } from '@/cli/hooks/use-smart-filter.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEmail(overrides?: Partial<Email>): Email {
  return {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Test Subject',
    sender: { email: 'sender@example.com', name: 'Sender' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: 'Test body content' },
    labels: [],
    isRead: false,
    snippet: 'Test snippet',
    historyId: 'history-1',
    syncedAt: new Date(),
    ...overrides,
  };
}

function createMockClassification(overrides?: Partial<EmailClassification>): EmailClassification {
  return {
    emailId: 'email-1',
    matches: true,
    confidence: 0.9,
    ...overrides,
  };
}

function createMockAiProvider(classifications: EmailClassification[] = []): AiProvider {
  return {
    classifyEmails: vi.fn().mockResolvedValue(classifications),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useSmartFilter', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Test 1: Initial state is idle
  it('should have initial state of idle', () => {
    const emails = [createMockEmail()];
    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    const { lastFrame } = render(React.createElement(TestComponent));

    expect(lastFrame()).toContain('State: idle');
    expect(capturedState.state).toBe('idle');
    expect(capturedState.filterDescription).toBeUndefined();
    expect(capturedState.filteredResults).toBeUndefined();
    expect(capturedState.error).toBeUndefined();
  });

  // Test 2: activateFilter sets input mode
  it('should set state to input when activateFilter is called', () => {
    const emails = [createMockEmail()];
    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    expect(capturedState.state).toBe('input');
  });

  // Test 3: submitFilter triggers evaluation with loading state
  it('should set state to loading when submitFilter is called', async () => {
    const emails = [createMockEmail({ id: 'email-1' })];
    const mockProvider = createMockAiProvider([
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.9 }),
    ]);

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    const submitPromise = capturedState.submitFilter('test filter', mockProvider);

    expect(capturedState.state).toBe('loading');

    await submitPromise;
  });

  // Test 4: successful evaluation updates filtered results
  it('should update filtered results on successful evaluation', async () => {
    const emails = [
      createMockEmail({ id: 'email-1' }),
      createMockEmail({ id: 'email-2' }),
      createMockEmail({ id: 'email-3' }),
    ];

    const classifications = [
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.9 }),
      createMockClassification({ emailId: 'email-2', matches: false, confidence: 0.3 }),
      createMockClassification({ emailId: 'email-3', matches: true, confidence: 0.8 }),
    ];

    const mockProvider = createMockAiProvider(classifications);

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    await capturedState.submitFilter('test filter', mockProvider);

    expect(capturedState.state).toBe('filtered');
    expect(capturedState.filterDescription).toBe('test filter');
    expect(capturedState.filteredResults).toBeDefined();
    expect(capturedState.filteredResults?.matchingResults).toHaveLength(2);
    expect(capturedState.filteredResults?.matchingResults[0].emailId).toBe('email-1');
    expect(capturedState.filteredResults?.matchingResults[1].emailId).toBe('email-3');
  });

  // Test 5: error preserves unfiltered view
  it('should preserve unfiltered view and show error on evaluation failure', async () => {
    const emails = [createMockEmail({ id: 'email-1' }), createMockEmail({ id: 'email-2' })];

    const mockProvider = {
      classifyEmails: vi.fn().mockRejectedValue(new Error('API error')),
    };

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    await capturedState.submitFilter('test filter', mockProvider as AiProvider);

    expect(capturedState.state).toBe('error');
    expect(capturedState.error).toBeDefined();
    expect(capturedState.error?.message).toContain('API error');
    expect(capturedState.filteredResults).toBeUndefined();
  });

  // Test 6: clearFilter restores idle state
  it('should restore idle state when clearFilter is called', async () => {
    const emails = [createMockEmail({ id: 'email-1' })];

    const classifications = [
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.9 }),
    ];

    const mockProvider = createMockAiProvider(classifications);

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    await capturedState.submitFilter('test filter', mockProvider);

    expect(capturedState.state).toBe('filtered');
    expect(capturedState.filterDescription).toBe('test filter');

    capturedState.clearFilter();

    expect(capturedState.state).toBe('idle');
    expect(capturedState.filterDescription).toBeUndefined();
    expect(capturedState.filteredResults).toBeUndefined();
    expect(capturedState.error).toBeUndefined();
  });

  // Test 7: missing config shows error message (FR-017)
  it('should show error when AI config is missing', async () => {
    const emails = [createMockEmail({ id: 'email-1' })];

    delete process.env.AI_PROVIDER;
    delete process.env.AI_MODEL;
    delete process.env.AI_API_KEY;

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    await capturedState.submitFilter('test filter');

    expect(capturedState.state).toBe('error');
    expect(capturedState.error).toBeDefined();
    expect(capturedState.error?.message).toContain('AI configuration');
  });

  // Additional test: clearFilter during loading cancels evaluation
  it('should cancel in-flight evaluation when clearFilter is called during loading', async () => {
    const emails = [createMockEmail({ id: 'email-1' })];

    let resolveClassify: (value: EmailClassification[]) => void;
    const classifyPromise = new Promise<EmailClassification[]>((resolve) => {
      resolveClassify = resolve;
    });

    const mockProvider = {
      classifyEmails: vi.fn().mockReturnValue(classifyPromise),
    };

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    const submitPromise = capturedState.submitFilter('test filter', mockProvider as AiProvider);

    expect(capturedState.state).toBe('loading');

    capturedState.clearFilter();

    expect(capturedState.state).toBe('idle');

    resolveClassify!([]);
    await submitPromise.catch(() => {
      // Expected to reject due to cancellation
    });
  });

  // Additional test: results are sorted by confidence descending
  it('should sort filtered results by confidence descending', async () => {
    const emails = [
      createMockEmail({ id: 'email-1' }),
      createMockEmail({ id: 'email-2' }),
      createMockEmail({ id: 'email-3' }),
    ];

    const classifications = [
      createMockClassification({ emailId: 'email-1', matches: true, confidence: 0.5 }),
      createMockClassification({ emailId: 'email-2', matches: true, confidence: 0.9 }),
      createMockClassification({ emailId: 'email-3', matches: true, confidence: 0.7 }),
    ];

    const mockProvider = createMockAiProvider(classifications);

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    await capturedState.submitFilter('test filter', mockProvider);

    expect(capturedState.filteredResults?.matchingResults).toHaveLength(3);
    expect(capturedState.filteredResults?.matchingResults[0].confidence).toBe(0.9);
    expect(capturedState.filteredResults?.matchingResults[1].confidence).toBe(0.7);
    expect(capturedState.filteredResults?.matchingResults[2].confidence).toBe(0.5);
  });

  // Additional test: empty filter description is rejected
  it('should reject empty filter description', async () => {
    const emails = [createMockEmail({ id: 'email-1' })];
    const mockProvider = createMockAiProvider([]);

    let capturedState: any;

    function TestComponent(): React.ReactElement {
      const result = useSmartFilter(emails);
      capturedState = result;
      return React.createElement(
        Box,
        null,
        React.createElement(Text, null, `State: ${result.state}`)
      );
    }

    render(React.createElement(TestComponent));

    capturedState.activateFilter();

    await capturedState.submitFilter('', mockProvider);

    expect(capturedState.state).toBe('error');
    expect(capturedState.error?.message).toContain('empty');
  });
});
