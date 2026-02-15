/**
 * Custom error classes for Gmail Sweep.
 * All errors extend GmailSweepError for consistent handling.
 */

/**
 * T013: Base error class for all Gmail Sweep errors.
 */
export class GmailSweepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailSweepError';
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * T014: Authentication error for OAuth failures.
 */
export class AuthenticationError extends GmailSweepError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * T015: Gmail API error for general API failures.
 */
export class GmailAPIError extends GmailSweepError {
  /** HTTP status code if available */
  statusCode: number | undefined;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'GmailAPIError';
    if (statusCode !== undefined) {
      this.statusCode = statusCode;
    }
  }
}

/**
 * T015: Rate limit error when quota exceeded.
 */
export class RateLimitError extends GmailAPIError {
  /** Suggested retry delay in milliseconds */
  retryAfterMs: number | undefined;

  constructor(message: string, retryAfterMs?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
    if (retryAfterMs !== undefined) {
      this.retryAfterMs = retryAfterMs;
    }
  }
}

/**
 * T016: Resource not found error.
 */
export class NotFoundError extends GmailAPIError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Classification error for LLM failures (US3).
 */
export class ClassificationError extends GmailSweepError {
  constructor(message: string) {
    super(message);
    this.name = 'ClassificationError';
  }
}

/**
 * Confirmation required for destructive actions (US4).
 */
export class ConfirmationRequired extends GmailSweepError {
  /** The action that requires confirmation */
  action: string;
  /** Number of emails affected */
  emailCount: number;

  constructor(action: string, emailCount: number) {
    super(`Action '${action}' requires confirmation for ${emailCount} email(s)`);
    this.name = 'ConfirmationRequired';
    this.action = action;
    this.emailCount = emailCount;
  }
}

/**
 * Configuration error for invalid or missing config.
 */
export class ConfigurationError extends GmailSweepError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Cache error for database issues.
 */
export class CacheError extends GmailSweepError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheError';
  }
}

/**
 * T017: AI provider error for LLM API failures.
 */
export class AiProviderError extends GmailSweepError {
  /** Which provider failed (e.g. 'anthropic', 'openai') */
  provider: string;
  /** HTTP status code if available */
  statusCode: number | undefined;

  constructor(
    message: string,
    provider: string,
    options?: { statusCode?: number; cause?: Error },
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.provider = provider;
    if (options?.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
