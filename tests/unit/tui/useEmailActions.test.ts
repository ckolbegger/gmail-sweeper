// @vitest-environment jsdom
/**
 * T003/T006/T011: Unit tests for useEmailActions hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Email } from '../../../src/core/models/index.js';
import type { GmailClient } from '../../../src/core/gmail/client.js';

function makeEmail(id: string): Email {
  return {
    id,
    threadId: `thread-${id}`,
    subject: `Email ${id}`,
    sender: { email: `sender${id}@test.com`, name: `Sender ${id}` },
    recipients: [],
    date: new Date('2026-01-01'),
    snippet: `Snippet ${id}`,
    labels: [],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
  };
}

function makeClient(overrides: Partial<GmailClient> = {}): GmailClient {
  return {
    archive: vi.fn().mockResolvedValue({ succeeded: [], failed: [] }),
    trash: vi.fn().mockResolvedValue({ succeeded: [], failed: [] }),
    ...overrides,
  } as unknown as GmailClient;
}

// Lazy import so module loads after any mocks
const importHook = async () => {
  const mod = await import('../../../src/tui/hooks/useEmailActions.js');
  return mod.useEmailActions;
};

describe('useEmailActions', () => {
  let onRemove: ReturnType<typeof vi.fn>;
  let onRestore: ReturnType<typeof vi.fn>;
  let emails: Email[];

  beforeEach(() => {
    onRemove = vi.fn();
    onRestore = vi.fn();
    emails = [makeEmail('a'), makeEmail('b'), makeEmail('c')];
  });

  describe('T003: archive', () => {
    it('happy path: calls onRemove then client.archive', async () => {
      const useEmailActions = await importHook();
      const client = makeClient({
        archive: vi.fn().mockResolvedValue({ succeeded: ['b'], failed: [] }),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      await act(async () => {
        result.current.archive('b');
      });

      expect(onRemove).toHaveBeenCalledWith('b');
      expect(client.archive).toHaveBeenCalledWith(['b']);
      expect(onRestore).not.toHaveBeenCalled();
      expect(result.current.actionError).toBeNull();
    });

    it('failure (reject): reverts with onRestore and sets actionError', async () => {
      const useEmailActions = await importHook();
      const client = makeClient({
        archive: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      await act(async () => {
        result.current.archive('b');
      });

      expect(onRemove).toHaveBeenCalledWith('b');
      expect(onRestore).toHaveBeenCalledWith(emails[1], 1);
      expect(result.current.actionError).toContain('archive');
    });

    it('failure (failed array): reverts with onRestore and sets actionError', async () => {
      const useEmailActions = await importHook();
      const client = makeClient({
        archive: vi.fn().mockResolvedValue({
          succeeded: [],
          failed: [{ id: 'b', error: 'Server error' }],
        }),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      await act(async () => {
        result.current.archive('b');
      });

      expect(onRemove).toHaveBeenCalledWith('b');
      expect(onRestore).toHaveBeenCalledWith(emails[1], 1);
      expect(result.current.actionError).toBeTruthy();
    });

    it('in-flight guard: calling archive twice for same id only calls onRemove once', async () => {
      const useEmailActions = await importHook();
      let resolveArchive!: (v: { succeeded: string[]; failed: never[] }) => void;
      const client = makeClient({
        archive: vi.fn().mockImplementation(
          () => new Promise(r => { resolveArchive = r; }),
        ),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      act(() => {
        result.current.archive('b');
      });
      act(() => {
        result.current.archive('b'); // duplicate — should be ignored
      });

      expect(onRemove).toHaveBeenCalledTimes(1);

      // Resolve the pending call to avoid hanging
      await act(async () => {
        resolveArchive({ succeeded: ['b'], failed: [] });
      });
    });

    it('no-op when client is undefined', async () => {
      const useEmailActions = await importHook();

      const { result } = renderHook(() =>
        useEmailActions({ client: undefined, emails, onRemove, onRestore }),
      );

      await act(async () => {
        result.current.archive('b');
      });

      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('T006: delete', () => {
    it('happy path: calls onRemove then client.trash', async () => {
      const useEmailActions = await importHook();
      const client = makeClient({
        trash: vi.fn().mockResolvedValue({ succeeded: ['b'], failed: [] }),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      await act(async () => {
        result.current.delete('b');
      });

      expect(onRemove).toHaveBeenCalledWith('b');
      expect(client.trash).toHaveBeenCalledWith(['b']);
      expect(onRestore).not.toHaveBeenCalled();
      expect(result.current.actionError).toBeNull();
    });

    it('failure (reject): reverts with onRestore and sets actionError', async () => {
      const useEmailActions = await importHook();
      const client = makeClient({
        trash: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      await act(async () => {
        result.current.delete('b');
      });

      expect(onRemove).toHaveBeenCalledWith('b');
      expect(onRestore).toHaveBeenCalledWith(emails[1], 1);
      expect(result.current.actionError).toContain('delete');
    });

    it('in-flight guard: calling delete twice for same id only calls onRemove once', async () => {
      const useEmailActions = await importHook();
      let resolveTrash!: (v: { succeeded: string[]; failed: never[] }) => void;
      const client = makeClient({
        trash: vi.fn().mockImplementation(
          () => new Promise(r => { resolveTrash = r; }),
        ),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      act(() => {
        result.current.delete('b');
      });
      act(() => {
        result.current.delete('b'); // duplicate
      });

      expect(onRemove).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveTrash({ succeeded: ['b'], failed: [] });
      });
    });

    it('in-flight guard is independent per action: archive a does not block delete b', async () => {
      const useEmailActions = await importHook();
      let resolveArchive!: (v: { succeeded: string[]; failed: never[] }) => void;
      const client = makeClient({
        archive: vi.fn().mockImplementation(
          () => new Promise(r => { resolveArchive = r; }),
        ),
        trash: vi.fn().mockResolvedValue({ succeeded: ['b'], failed: [] }),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      act(() => {
        result.current.archive('a');
      });

      await act(async () => {
        result.current.delete('b');
      });

      // Both onRemove calls should have gone through
      expect(onRemove).toHaveBeenCalledTimes(2);
      expect(onRemove).toHaveBeenCalledWith('a');
      expect(onRemove).toHaveBeenCalledWith('b');

      await act(async () => {
        resolveArchive({ succeeded: ['a'], failed: [] });
      });
    });
  });

  describe('T011: auto-clear actionError', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('clears actionError after 4000ms', async () => {
      const useEmailActions = await importHook();
      const client = makeClient({
        archive: vi.fn().mockRejectedValue(new Error('fail')),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore }),
      );

      await act(async () => {
        result.current.archive('a');
      });

      expect(result.current.actionError).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.actionError).toBeNull();
    });
  });

  describe('US1-bug-1: onPersistRemove cache callback', () => {
    it('calls onPersistRemove after successful archive', async () => {
      const useEmailActions = await importHook();
      const onPersistRemove = vi.fn();
      const client = makeClient({
        archive: vi.fn().mockResolvedValue({ succeeded: ['b'], failed: [] }),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore, onPersistRemove }),
      );

      await act(async () => { result.current.archive('b'); });

      expect(onPersistRemove).toHaveBeenCalledWith('b');
    });

    it('calls onPersistRemove after successful delete', async () => {
      const useEmailActions = await importHook();
      const onPersistRemove = vi.fn();
      const client = makeClient({
        trash: vi.fn().mockResolvedValue({ succeeded: ['b'], failed: [] }),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore, onPersistRemove }),
      );

      await act(async () => { result.current.delete('b'); });

      expect(onPersistRemove).toHaveBeenCalledWith('b');
    });

    it('does NOT call onPersistRemove when archive fails (reject)', async () => {
      const useEmailActions = await importHook();
      const onPersistRemove = vi.fn();
      const client = makeClient({
        archive: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore, onPersistRemove }),
      );

      await act(async () => { result.current.archive('b'); });

      expect(onPersistRemove).not.toHaveBeenCalled();
    });

    it('does NOT call onPersistRemove when archive returns failed result', async () => {
      const useEmailActions = await importHook();
      const onPersistRemove = vi.fn();
      const client = makeClient({
        archive: vi.fn().mockResolvedValue({ succeeded: [], failed: [{ id: 'b', error: 'API error' }] }),
      });

      const { result } = renderHook(() =>
        useEmailActions({ client, emails, onRemove, onRestore, onPersistRemove }),
      );

      await act(async () => { result.current.archive('b'); });

      expect(onPersistRemove).not.toHaveBeenCalled();
    });
  });
});
