/**
 * Base error class for all application errors
 */
export class GmailSweepError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GmailSweepError';
  }
}

/**
 * Gmail API specific errors
 */
export class GmailError extends GmailSweepError {
  constructor(
    public readonly code: GmailErrorCode,
    message: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'GmailError';
  }
}

export type GmailErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/**
 * Database errors
 */
export class DatabaseError extends GmailSweepError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DatabaseError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends GmailSweepError {
  constructor(
    public readonly field: string,
    message: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends GmailSweepError {
  constructor(
    public readonly key: string,
    message: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * AI Provider errors
 */
export class AiProviderError extends GmailSweepError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'AiProviderError';
  }

}

/**
 * Summary generation errors
 */
export class SummaryGenerationError extends GmailSweepError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'SummaryGenerationError';
  }
}

