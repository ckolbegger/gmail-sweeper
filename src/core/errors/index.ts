/**
 * Error Classes
 *
 * Domain-specific error types for the application.
 */

// ============================================================================
// Gmail Error
// ============================================================================

export type GmailErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class GmailError extends Error {
  constructor(
    public readonly code: GmailErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GmailError';
  }

  /**
   * Check if error is authentication-related
   */
  isAuthError(): boolean {
    return this.code === 'AUTH_REQUIRED' || this.code === 'AUTH_EXPIRED';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.code === 'RATE_LIMITED' || this.code === 'NETWORK_ERROR';
  }
}

// ============================================================================
// Database Error
// ============================================================================

export type DatabaseErrorCode =
  | 'CONNECTION_FAILED'
  | 'QUERY_FAILED'
  | 'CONSTRAINT_VIOLATION'
  | 'NOT_FOUND'
  | 'MIGRATION_FAILED';

export class DatabaseError extends Error {
  constructor(
    public readonly code: DatabaseErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// Validation Error
// ============================================================================

export class ValidationError extends Error {
  public readonly errors: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    errors: Array<{ path: string; message: string }> = []
  ) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// ============================================================================
// Configuration Error
// ============================================================================

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Check if an error is a specific error type
 */
export function isGmailError(error: unknown): error is GmailError {
  return error instanceof GmailError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Get error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
