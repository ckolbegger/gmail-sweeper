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

type ErrorRecord = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
  errors?: unknown;
  issues?: unknown;
  details?: unknown;
};

function asErrorRecord(err: unknown): ErrorRecord | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }
  return err as ErrorRecord;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function mapError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const record = asErrorRecord(err);
  const status = getNumber(record?.status) ?? getNumber(record?.code);

  if (status !== undefined) {
    return new GmailError('Failed to communicate with Gmail', {
      status,
      cause: getString(record?.message),
      errors: record?.errors
    });
  }

  if (record?.name === 'ValidationError' || record?.issues !== undefined) {
    return new ValidationError('Invalid input. Please review and try again.', {
      cause: getString(record?.message),
      issues: record?.issues
    });
  }

  if (err instanceof Error) {
    return new AppError('Unexpected error', 'UNHANDLED_ERROR', {
      cause: err.message
    });
  }

  return new AppError('Unknown error', 'UNKNOWN_ERROR', {
    cause: err
  });
}
