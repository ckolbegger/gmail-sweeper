import { describe, expect, it, vi } from 'vitest';

import { createPersistedSummaryFixture } from './fixtures/ai_summary.fixtures.js';

import { applyTuiCommand, createTuiAppState, renderTuiScreen } from '@/tui/app.js';

const RAW_DETAIL = {
  subject: 'Follow up needed',
  sender: 'lead@example.com',
  body: 'RAW: Please send an update by Friday.'
};

describe('ink app root state container', () => {
  it('should render inbox list with selected row highlight', () => {
    const state = createTuiAppState(2);
    const lines = renderTuiScreen(['First', 'Second'], state);

    expect(lines.join('\n')).toContain('> [1] First');
    expect(lines.join('\n')).toContain('  [2] Second');
  });

  it('should render detail pane for the selected message', async () => {
    let state = createTuiAppState(2);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View', 'Body msg-2']);

    state = await applyTuiCommand(
      state,
      'down',
      { messageIds: ['msg-1', 'msg-2'], fetchDetailLines }
    );
    state = await applyTuiCommand(
      state,
      'open',
      { messageIds: ['msg-1', 'msg-2'], fetchDetailLines }
    );

    const lines = renderTuiScreen(['First', 'Second'], state);
    expect(lines.join('\n')).toContain('Detail View');
    expect(lines.join('\n')).toContain('Body msg-2');
  });

  it('should transition between list and detail view modes', async () => {
    let state = createTuiAppState(3);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View', 'Body msg-2']);

    state = await applyTuiCommand(
      state,
      'down',
      { messageIds: ['msg-1', 'msg-2', 'msg-3'], fetchDetailLines }
    );
    state = await applyTuiCommand(
      state,
      'open',
      { messageIds: ['msg-1', 'msg-2', 'msg-3'], fetchDetailLines }
    );
    expect(state.navigation.viewMode).toBe('detail');

    state = await applyTuiCommand(
      state,
      'back',
      { messageIds: ['msg-1', 'msg-2', 'msg-3'], fetchDetailLines }
    );
    expect(state.navigation.viewMode).toBe('list');
    expect(state.navigation.selectedIndex).toBe(1);
  });

  it('should keep selected row visible when list selection moves past initial viewport', async () => {
    let state = createTuiAppState(25, 5);
    const messageIds = Array.from({ length: 25 }, (_, index) => `msg-${index + 1}`);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View']);

    for (let index = 0; index < 8; index += 1) {
      state = await applyTuiCommand(state, 'down', { messageIds, fetchDetailLines });
    }

    const lines = renderTuiScreen(
      messageIds.map((messageId, index) => `Line ${index + 1} ${messageId}`),
      state
    );

    expect(lines.join('\n')).toContain('> [9] Line 9 msg-9');
    expect(lines.join('\n')).toContain('  [7] Line 7 msg-7');
  });

  it('should render all rows when viewport is larger than the list', () => {
    const state = createTuiAppState(25, 40);
    const lines = renderTuiScreen(
      Array.from({ length: 25 }, (_, index) => `Line ${index + 1}`),
      state
    );

    const indexedRows = lines.filter((line) => line.startsWith('> [') || line.startsWith('  ['));
    expect(indexedRows).toHaveLength(25);
  });

  it('should archive selected email in list view and remove it from rendered rows', async () => {
    let state = createTuiAppState(3);
    const archiveEmail = vi.fn().mockResolvedValue(undefined);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View']);

    state = await applyTuiCommand(state, 'down', {
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
      fetchDetailLines
    });
    state = await applyTuiCommand(state, 'archive', {
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
      fetchDetailLines,
      archiveEmail
    });

    expect(archiveEmail).toHaveBeenCalledWith('msg-2');
    expect(state.navigation.viewMode).toBe('list');
    expect(state.navigation.listSize).toBe(2);
    expect(state.statusLine).toContain('Archived selected email');

    const lines = renderTuiScreen(['First', 'Second', 'Third'], state).join('\n');
    expect(lines).toContain('First');
    expect(lines).toContain('Third');
    expect(lines).not.toContain('Second');
  });

  it('should delete selected email in detail view and return to list', async () => {
    let state = createTuiAppState(3);
    const deleteEmail = vi.fn().mockResolvedValue(undefined);
    const fetchDetailLines = vi.fn().mockResolvedValue(['Detail View', 'Body msg-2']);

    state = await applyTuiCommand(state, 'down', {
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
      fetchDetailLines
    });
    state = await applyTuiCommand(state, 'open', {
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
      fetchDetailLines
    });
    state = await applyTuiCommand(state, 'delete', {
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
      fetchDetailLines,
      deleteEmail
    });

    expect(deleteEmail).toHaveBeenCalledWith('msg-2');
    expect(state.navigation.viewMode).toBe('list');
    expect(state.navigation.listSize).toBe(2);
    expect(state.detailLines).toEqual([]);
    expect(state.statusLine).toContain('Deleted selected email');

    const lines = renderTuiScreen(['First', 'Second', 'Third'], state).join('\n');
    expect(lines).toContain('First');
    expect(lines).toContain('Third');
    expect(lines).not.toContain('Second');
  });

  it('should open summary mode from detail and toggle back to full', async () => {
    let state = createTuiAppState(1);
    const fetchDetailLines = vi.fn().mockResolvedValue([
      'Detail View',
      'Message: msg-1',
      'Subject: Follow up needed',
      'From: lead@example.com',
      'Date: 2026-03-07T00:00:00.000Z',
      '',
      'Please send an update by Friday.'
    ]);
    const summaryService = {
      getOrGenerateSummary: vi.fn().mockResolvedValue({
        record: createPersistedSummaryFixture({
          messageId: 'msg-1',
          summarySentence: 'The sender asks for a Friday update.',
          actionItems: ['Send an update by Friday']
        }),
        cacheHit: false
      })
    };

    state = await applyTuiCommand(state, 'open', {
      messageIds: ['msg-1'],
      fetchDetailLines,
      fetchDetailData: async () => RAW_DETAIL,
      summaryService
    });
    state = await applyTuiCommand(state, 'summary', {
      messageIds: ['msg-1'],
      fetchDetailLines,
      fetchDetailData: async () => RAW_DETAIL,
      summaryService
    });

    expect(state.detailSummary.mode).toBe('summary');
    expect(renderTuiScreen(['First'], state).join('\n')).toContain('- Send an update by Friday');
    expect(summaryService.getOrGenerateSummary).toHaveBeenCalledOnce();
    expect(summaryService.getOrGenerateSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'RAW: Please send an update by Friday.'
      })
    );

    state = await applyTuiCommand(state, 'summary', {
      messageIds: ['msg-1'],
      fetchDetailLines,
      fetchDetailData: async () => RAW_DETAIL,
      summaryService
    });
    expect(state.detailSummary.mode).toBe('full');
    expect(renderTuiScreen(['First'], state).join('\n')).toContain('Detail View');
  });

  it('should ignore repeated summary commands while loading', async () => {
    let state = createTuiAppState(1);
    const fetchDetailLines = vi.fn().mockResolvedValue([
      'Detail View',
      'Message: msg-1',
      'Subject: Follow up needed',
      'From: lead@example.com',
      'Date: 2026-03-07T00:00:00.000Z',
      '',
      'Please send an update by Friday.'
    ]);
    const pending = new Promise<{ record: ReturnType<typeof createPersistedSummaryFixture>; cacheHit: boolean }>(
      () => undefined
    );
    const summaryService = {
      getOrGenerateSummary: vi.fn().mockReturnValue(pending)
    };
    const onStateUpdate = vi.fn();

    state = await applyTuiCommand(state, 'open', {
      messageIds: ['msg-1'],
      fetchDetailLines,
      fetchDetailData: async () => RAW_DETAIL,
      summaryService
    });

    void applyTuiCommand(
      state,
      'summary',
      {
        messageIds: ['msg-1'],
        fetchDetailLines,
        fetchDetailData: async () => RAW_DETAIL,
        summaryService,
        onStateUpdate
      },
      ''
    );

    const loadingState = onStateUpdate.mock.calls[0]?.[0];
    expect(loadingState.detailSummary.mode).toBe('loading_summary');

    const next = await applyTuiCommand(loadingState, 'summary', {
      messageIds: ['msg-1'],
      fetchDetailLines,
      fetchDetailData: async () => RAW_DETAIL,
      summaryService
    });
    expect(next).toBe(loadingState);
    expect(summaryService.getOrGenerateSummary).toHaveBeenCalledTimes(1);
  });

  it('should keep full detail active and surface error when summary generation fails', async () => {
    let state = createTuiAppState(1);
    const fetchDetailLines = vi.fn().mockResolvedValue([
      'Detail View',
      'Message: msg-1',
      'Subject: Follow up needed',
      'From: lead@example.com',
      'Date: 2026-03-07T00:00:00.000Z',
      '',
      'Please send an update by Friday.'
    ]);
    const summaryService = {
      getOrGenerateSummary: vi.fn().mockRejectedValue(new Error('provider offline'))
    };

    state = await applyTuiCommand(state, 'open', {
      messageIds: ['msg-1'],
      fetchDetailLines,
      fetchDetailData: async () => RAW_DETAIL,
      summaryService
    });
    state = await applyTuiCommand(state, 'summary', {
      messageIds: ['msg-1'],
      fetchDetailLines,
      fetchDetailData: async () => RAW_DETAIL,
      summaryService
    });

    expect(state.detailSummary.mode).toBe('full');
    expect(state.statusLine).toContain('(error)');
    expect(renderTuiScreen(['First'], state).join('\n')).toContain('Detail View');
  });

  it('should ignore stale summary completion when a newer detail session exists', async () => {
    const deferred = (): {
      promise: Promise<{ record: ReturnType<typeof createPersistedSummaryFixture>; cacheHit: boolean }>;
      resolve: (value: { record: ReturnType<typeof createPersistedSummaryFixture>; cacheHit: boolean }) => void;
    } => {
      let resolve: (value: { record: ReturnType<typeof createPersistedSummaryFixture>; cacheHit: boolean }) => void =
        () => undefined;
      const promise = new Promise<{
        record: ReturnType<typeof createPersistedSummaryFixture>;
        cacheHit: boolean;
      }>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    };

    let state = createTuiAppState(2);
    const fetchDetailLines = vi
      .fn()
      .mockResolvedValueOnce([
        'Detail View',
        'Message: msg-1',
        'Subject: First subject',
        'From: first@example.com',
        'Date: 2026-03-07T00:00:00.000Z',
        '',
        'First body'
      ])
      .mockResolvedValueOnce([
        'Detail View',
        'Message: msg-2',
        'Subject: Second subject',
        'From: second@example.com',
        'Date: 2026-03-07T00:00:00.000Z',
        '',
        'Second body'
      ]);
    const fetchDetailData = vi
      .fn()
      .mockResolvedValueOnce({
        subject: 'First subject',
        sender: 'first@example.com',
        body: 'RAW FIRST BODY'
      })
      .mockResolvedValueOnce({
        subject: 'Second subject',
        sender: 'second@example.com',
        body: 'RAW SECOND BODY'
      });
    const run = deferred();
    const summaryService = {
      getOrGenerateSummary: vi.fn().mockReturnValue(run.promise)
    };
    const onStateUpdate = vi.fn();

    state = await applyTuiCommand(state, 'open', {
      messageIds: ['msg-1', 'msg-2'],
      fetchDetailLines,
      fetchDetailData,
      summaryService
    });

    const pendingSummary = applyTuiCommand(state, 'summary', {
      messageIds: ['msg-1', 'msg-2'],
      fetchDetailLines,
      fetchDetailData,
      summaryService,
      onStateUpdate
    });
    state = onStateUpdate.mock.calls[0]?.[0];

    state = await applyTuiCommand(state, 'back', {
      messageIds: ['msg-1', 'msg-2'],
      fetchDetailLines,
      fetchDetailData,
      summaryService
    });
    state = await applyTuiCommand(state, 'down', {
      messageIds: ['msg-1', 'msg-2'],
      fetchDetailLines,
      fetchDetailData,
      summaryService
    });
    state = await applyTuiCommand(state, 'open', {
      messageIds: ['msg-1', 'msg-2'],
      fetchDetailLines,
      fetchDetailData,
      summaryService
    });

    run.resolve({
      record: createPersistedSummaryFixture({
        messageId: 'msg-1',
        summarySentence: 'Old summary should not apply.',
        actionItems: ['None']
      }),
      cacheHit: false
    });
    const staleResult = await pendingSummary;

    const accepted = staleResult.detailSummary.requestId < state.detailSummary.requestId ? state : staleResult;
    expect(accepted.detailSummary.messageId).toBe('msg-2');
    expect(accepted.detailSummary.mode).toBe('full');
  });
});
