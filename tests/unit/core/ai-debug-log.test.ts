import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { logAiDebug } from '../../../src/core/logging/ai-debug-log.js';

vi.mock('node:fs', () => ({
  appendFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  tmpdir: vi.fn(),
}));

describe('logAiDebug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tmpdir).mockReturnValue('/tmp');
    delete process.env.DEBUG_AI;
  });

  it('does not write when DEBUG_AI is not true', () => {
    process.env.DEBUG_AI = 'false';

    logAiDebug('SummaryService', 'generateSummary called');

    expect(appendFileSync).not.toHaveBeenCalled();
  });

  it('writes formatted log line using os.tmpdir and path.join when DEBUG_AI is true', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    process.env.DEBUG_AI = 'true';
    vi.mocked(tmpdir).mockReturnValue('/var/tmp');

    logAiDebug('AnthropicProvider', 'callLLM called');

    expect(appendFileSync).toHaveBeenCalledWith(
      path.join('/var/tmp', 'gmail-sweep-debug.log'),
      '2026-03-07T12:00:00.000Z [AnthropicProvider] callLLM called\n'
    );

    vi.useRealTimers();
  });

  it('includes meta in formatted log line when provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
    process.env.DEBUG_AI = 'true';

    logAiDebug('Startup', 'AI config loaded', { provider: 'openai', model: 'gpt-4o' });

    expect(appendFileSync).toHaveBeenCalledWith(
      path.join('/tmp', 'gmail-sweep-debug.log'),
      '2026-03-07T12:00:00.000Z [Startup] AI config loaded {"provider":"openai","model":"gpt-4o"}\n'
    );

    vi.useRealTimers();
  });

  it('fails safe without crashing when temp path is unavailable or unwritable', () => {
    process.env.DEBUG_AI = 'true';
    vi.mocked(tmpdir).mockImplementation(() => {
      throw new Error('tmpdir unavailable');
    });
    vi.mocked(appendFileSync).mockImplementation(() => {
      throw new Error('unwritable');
    });

    expect(() => logAiDebug('SummaryService', 'generateSummary called')).not.toThrow();
  });
});
