import { describe, expect, it } from 'vitest';

import { AppError, GmailError, ValidationError, mapError } from '@/core/errors.js';

describe('error mapping', () => {
  it('should map Gmail errors to domain errors', () => {
    const mapped = mapError({
      status: 429,
      message: 'Rate limit exceeded',
      errors: [{ reason: 'rateLimitExceeded' }]
    });

    expect(mapped).toBeInstanceOf(GmailError);
    expect(mapped.message).toBe('Failed to communicate with Gmail');
    expect(mapped.details).toEqual({
      status: 429,
      cause: 'Rate limit exceeded',
      errors: [{ reason: 'rateLimitExceeded' }]
    });
  });

  it('should map validation errors to user-safe messages', () => {
    const mapped = mapError({
      name: 'ValidationError',
      message: 'Sender is malformed',
      issues: [{ field: 'sender' }]
    });

    expect(mapped).toBeInstanceOf(ValidationError);
    expect(mapped.message).toBe('Invalid input. Please review and try again.');
  });

  it('should preserve original error context', () => {
    const mapped = mapError(new Error('connection dropped'));

    expect(mapped).toBeInstanceOf(AppError);
    expect(mapped.code).toBe('UNHANDLED_ERROR');
    expect(mapped.details).toEqual({
      cause: 'connection dropped'
    });
  });
});
