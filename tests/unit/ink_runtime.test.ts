import { describe, expect, it, vi } from 'vitest';

import type { InkRendererInstance } from '@/tui/ink_runtime.js';
import { runInkSession } from '@/tui/ink_runtime.js';

describe('ink runtime lifecycle adapter', () => {
  it('should create and unmount ink renderer cleanly', async () => {
    const waitUntilExit = vi.fn().mockResolvedValue(undefined);
    const unmount = vi.fn();
    const createRenderer = vi.fn().mockReturnValue({
      waitUntilExit,
      unmount
    } satisfies InkRendererInstance);

    await runInkSession(
      {
        listLines: ['First'],
        messageIds: ['msg-1'],
        fetchDetailLines: async () => ['Detail View']
      },
      {
        createRenderer
      }
    );

    expect(createRenderer).toHaveBeenCalledOnce();
    expect(waitUntilExit).toHaveBeenCalledOnce();
    expect(unmount).toHaveBeenCalledOnce();
  });

  it('should restore terminal state after quit', async () => {
    const setRawMode = vi.fn();
    const pause = vi.fn();
    const createRenderer = vi.fn().mockReturnValue({
      waitUntilExit: async () => undefined,
      unmount: () => undefined
    } satisfies InkRendererInstance);

    await runInkSession(
      {
        listLines: ['First'],
        messageIds: ['msg-1'],
        fetchDetailLines: async () => ['Detail View']
      },
      {
        createRenderer,
        stdin: {
          setRawMode,
          pause
        }
      }
    );

    expect(setRawMode).toHaveBeenCalledWith(false);
    expect(pause).toHaveBeenCalledOnce();
  });

  it('should avoid leaving open stdin handlers after exit', async () => {
    const cleanupInput = vi.fn();
    const createRenderer = vi.fn().mockReturnValue({
      waitUntilExit: async () => undefined,
      unmount: () => undefined,
      cleanupInput
    } satisfies InkRendererInstance);

    await runInkSession(
      {
        listLines: ['First'],
        messageIds: ['msg-1'],
        fetchDetailLines: async () => ['Detail View']
      },
      {
        createRenderer
      }
    );

    expect(cleanupInput).toHaveBeenCalledOnce();
  });
});
