/**
 * Logging Module
 *
 * Minimal console-based logging wrapper.
 */

// ============================================================================
// Log Levels
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Configuration
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

// ============================================================================
// Logger Class
// ============================================================================

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;

    const formattedMessage = args.length > 0
      ? `${prefix} ${message} ${args.map(arg => this.formatArg(arg)).join(' ')}`
      : `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  /**
   * Format argument for logging
   */
  private formatArg(arg: unknown): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number') return arg.toString();
    if (typeof arg === 'boolean') return arg.toString();
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    try {
      return JSON.stringify(arg);
    } catch {
      return '[Object]';
    }
  }
}

// ============================================================================
// Logger Factory
// ============================================================================

const loggers = new Map<string, Logger>();

/**
 * Get or create a logger for a context
 */
export function getLogger(context: string): Logger {
  if (!loggers.has(context)) {
    loggers.set(context, new Logger(context));
  }
  return loggers.get(context)!;
}

/**
 * Reset all loggers (useful for testing)
 */
export function resetLoggers(): void {
  loggers.clear();
}
