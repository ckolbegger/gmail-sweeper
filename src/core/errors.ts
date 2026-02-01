export class AppError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = 'APP_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class GmailError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GMAIL_ERROR', details);
  }
}

export function mapError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof Error) {
    return new AppError(err.message, 'UNHANDLED_ERROR');
  }
  return new AppError('Unknown error', 'UNKNOWN_ERROR');
}
