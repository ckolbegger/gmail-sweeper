import type { LogLevel } from './config';

const REDACT_KEYS = ['token', 'secret', 'password', 'authorization'];

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.includes(key.toLowerCase())) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redact(val);
      }
    }
    return out;
  }
  return value;
}

function shouldLog(level: LogLevel, current: LogLevel): boolean {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return order.indexOf(level) >= order.indexOf(current);
}

export function createLogger(level: LogLevel = 'info'): Logger {
  const log = (lvl: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (!shouldLog(lvl, level)) return;
    const payload = meta ? JSON.stringify(redact(meta)) : '';
    const line = payload ? `${message} ${payload}` : message;
    // eslint-disable-next-line no-console
    console[lvl === 'debug' ? 'log' : lvl](line);
  };

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta)
  };
}
