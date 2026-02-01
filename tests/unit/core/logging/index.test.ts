import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, getLogger, resetLoggers } from '../../../../src/core/logging/index.js';

describe('Logger', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetLoggers();
  });

  it('should log messages at different levels', () => {
    const logger = new Logger('TestContext');

    // Debug may not be called depending on LOG_LEVEL
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');

    // These should always be called
    expect(consoleInfoSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format log messages consistently', () => {
    const logger = new Logger('TestContext');

    logger.info('Test message');

    const callArg = consoleInfoSpy.mock.calls[0][0];
    expect(callArg).toContain('[INFO]');
    expect(callArg).toContain('[TestContext]');
    expect(callArg).toContain('Test message');
  });

  it('should handle null/undefined messages gracefully', () => {
    const logger = new Logger('TestContext');

    logger.info('Message with args', null, undefined, 'string');

    expect(consoleInfoSpy).toHaveBeenCalled();
    const callArg = consoleInfoSpy.mock.calls[0][0];
    expect(callArg).toContain('null');
    expect(callArg).toContain('undefined');
    expect(callArg).toContain('string');
  });

  it('should handle Error objects in args', () => {
    const logger = new Logger('TestContext');
    const error = new Error('Test error');

    logger.info('Error occurred', error);

    const callArg = consoleInfoSpy.mock.calls[0][0];
    expect(callArg).toContain('Error: Test error');
  });

  it('should handle object args with JSON.stringify', () => {
    const logger = new Logger('TestContext');
    const obj = { key: 'value', num: 123 };

    logger.info('Object data', obj);

    const callArg = consoleInfoSpy.mock.calls[0][0];
    expect(callArg).toContain('{"key":"value","num":123}');
  });
});

describe('getLogger', () => {
  afterEach(() => {
    resetLoggers();
  });

  it('should return logger for context', () => {
    const logger = getLogger('MyContext');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should return same logger for same context', () => {
    const logger1 = getLogger('SameContext');
    const logger2 = getLogger('SameContext');
    expect(logger1).toBe(logger2);
  });

  it('should return different loggers for different contexts', () => {
    const logger1 = getLogger('Context1');
    const logger2 = getLogger('Context2');
    expect(logger1).not.toBe(logger2);
  });
});
