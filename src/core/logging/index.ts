export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private entries: LogEntry[] = [];

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    this.entries.push(entry);

    const timestamp = entry.timestamp.toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${timestamp}] [DEBUG] ${message}${contextStr}`);
        break;
      case LogLevel.INFO:
        console.info(`[${timestamp}] [INFO] ${message}${contextStr}`);
        break;
      case LogLevel.WARN:
        console.warn(`[${timestamp}] [WARN] ${message}${contextStr}`);
        break;
      case LogLevel.ERROR:
        console.error(`[${timestamp}] [ERROR] ${message}${contextStr}`);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

export const logger = new Logger();

// Set log level from environment
if (process.env.LOG_LEVEL) {
  const level = LogLevel[(process.env.LOG_LEVEL.toUpperCase() as keyof typeof LogLevel)];
  if (typeof level === 'number') {
    logger.setLevel(level);
  }
}
