import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '@/core/logger.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logging utility', () => {
  it('should log at info/warn/error levels', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = createLogger('warn');

    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('should redact sensitive values', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = createLogger('info');

    logger.info('auth', {
      token: 'token-value',
      nested: { password: 'secret-value', keep: 'safe' }
    });

    const line = infoSpy.mock.calls[0]?.[0] as string;

    expect(line).toContain('[REDACTED]');
    expect(line).toContain('"keep":"safe"');
    expect(line).not.toContain('token-value');
    expect(line).not.toContain('secret-value');
  });

  it('should format logs consistently', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = createLogger('info');

    logger.info('operation_complete', { count: 2 });

    const line = infoSpy.mock.calls[0]?.[0] as string;
    expect(line).toBe('operation_complete {"count":2}');
  });
});
