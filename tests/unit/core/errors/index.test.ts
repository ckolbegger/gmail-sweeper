import { describe, it, expect } from 'vitest';
import {
  GmailError,
  DatabaseError,
  ValidationError,
  ConfigurationError,
  isGmailError,
  isDatabaseError,
  isValidationError,
  getErrorMessage,
} from '../../../../src/core/errors/index.js';

describe('GmailError', () => {
  it('should create GmailError with code and message', () => {
    const error = new GmailError('AUTH_REQUIRED', 'Authentication required');
    expect(error.code).toBe('AUTH_REQUIRED');
    expect(error.message).toBe('Authentication required');
    expect(error.name).toBe('GmailError');
  });

  it('should preserve error cause chain', () => {
    const cause = new Error('Original error');
    const error = new GmailError('NETWORK_ERROR', 'Network failed', cause);
    expect(error.cause).toBe(cause);
  });

  it('should support all GmailErrorCode values', () => {
    const codes: GmailError['code'][] = [
      'AUTH_REQUIRED',
      'AUTH_EXPIRED',
      'RATE_LIMITED',
      'NOT_FOUND',
      'INVALID_REQUEST',
      'NETWORK_ERROR',
      'UNKNOWN',
    ];

    codes.forEach(code => {
      const error = new GmailError(code, 'Test message');
      expect(error.code).toBe(code);
    });
  });

  it('should identify auth errors', () => {
    const authRequired = new GmailError('AUTH_REQUIRED', 'Auth required');
    const authExpired = new GmailError('AUTH_EXPIRED', 'Auth expired');
    const networkError = new GmailError('NETWORK_ERROR', 'Network failed');

    expect(authRequired.isAuthError()).toBe(true);
    expect(authExpired.isAuthError()).toBe(true);
    expect(networkError.isAuthError()).toBe(false);
  });

  it('should identify retryable errors', () => {
    const rateLimited = new GmailError('RATE_LIMITED', 'Rate limited');
    const networkError = new GmailError('NETWORK_ERROR', 'Network failed');
    const notFound = new GmailError('NOT_FOUND', 'Not found');

    expect(rateLimited.isRetryable()).toBe(true);
    expect(networkError.isRetryable()).toBe(true);
    expect(notFound.isRetryable()).toBe(false);
  });
});

describe('DatabaseError', () => {
  it('should create DatabaseError with code and message', () => {
    const error = new DatabaseError('CONNECTION_FAILED', 'Could not connect');
    expect(error.code).toBe('CONNECTION_FAILED');
    expect(error.message).toBe('Could not connect');
    expect(error.name).toBe('DatabaseError');
  });

  it('should preserve error cause', () => {
    const cause = new Error('SQLite error');
    const error = new DatabaseError('QUERY_FAILED', 'Query failed', cause);
    expect(error.cause).toBe(cause);
  });
});

describe('ValidationError', () => {
  it('should create ValidationError with message', () => {
    const error = new ValidationError('Validation failed');
    expect(error.message).toBe('Validation failed');
    expect(error.name).toBe('ValidationError');
  });

  it('should store validation errors array', () => {
    const errors = [
      { path: 'email', message: 'Invalid email' },
      { path: 'name', message: 'Name required' },
    ];
    const error = new ValidationError('Validation failed', errors);
    expect(error.errors).toEqual(errors);
  });
});

describe('ConfigurationError', () => {
  it('should create ConfigurationError with message', () => {
    const error = new ConfigurationError('Missing config');
    expect(error.message).toBe('Missing config');
    expect(error.name).toBe('ConfigurationError');
  });
});

describe('Type Guards', () => {
  it('should identify GmailError', () => {
    const gmailError = new GmailError('UNKNOWN', 'Test');
    const regularError = new Error('Test');

    expect(isGmailError(gmailError)).toBe(true);
    expect(isGmailError(regularError)).toBe(false);
    expect(isGmailError(null)).toBe(false);
    expect(isGmailError('string')).toBe(false);
  });

  it('should identify DatabaseError', () => {
    const dbError = new DatabaseError('QUERY_FAILED', 'Test');
    const regularError = new Error('Test');

    expect(isDatabaseError(dbError)).toBe(true);
    expect(isDatabaseError(regularError)).toBe(false);
  });

  it('should identify ValidationError', () => {
    const validationError = new ValidationError('Test');
    const regularError = new Error('Test');

    expect(isValidationError(validationError)).toBe(true);
    expect(isValidationError(regularError)).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should return message from Error', () => {
    const error = new Error('Test message');
    expect(getErrorMessage(error)).toBe('Test message');
  });

  it('should return string for string error', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should return stringified value for unknown types', () => {
    expect(getErrorMessage(123)).toBe('123');
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe('undefined');
  });
});
