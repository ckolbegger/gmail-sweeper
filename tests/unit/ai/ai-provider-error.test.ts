import { describe, it, expect } from 'vitest';
import { AiProviderError } from '../../../src/core/errors.js';
import { GmailSweepError } from '../../../src/core/errors.js';

describe('AiProviderError', () => {
  it('should be an instance of GmailSweepError', () => {
    const error = new AiProviderError('test error', 'anthropic');
    expect(error).toBeInstanceOf(GmailSweepError);
  });

  it('should have name "AiProviderError"', () => {
    const error = new AiProviderError('test error', 'openai');
    expect(error.name).toBe('AiProviderError');
  });

  it('should set provider property correctly', () => {
    const error = new AiProviderError('test error', 'anthropic');
    expect(error.provider).toBe('anthropic');
  });

  it('should pass message through', () => {
    const error = new AiProviderError('something went wrong', 'openai');
    expect(error.message).toBe('something went wrong');
  });

  it('should have optional statusCode (undefined by default)', () => {
    const error = new AiProviderError('test error', 'anthropic');
    expect(error.statusCode).toBeUndefined();
  });

  it('should set statusCode when provided', () => {
    const error = new AiProviderError('rate limited', 'openai', { statusCode: 429 });
    expect(error.statusCode).toBe(429);
  });

  it('should have optional cause (undefined by default)', () => {
    const error = new AiProviderError('test error', 'anthropic');
    expect(error.cause).toBeUndefined();
  });

  it('should set cause when provided', () => {
    const underlying = new Error('network failure');
    const error = new AiProviderError('provider failed', 'openai', { cause: underlying });
    expect(error.cause).toBe(underlying);
  });

  it('should accept both statusCode and cause together', () => {
    const underlying = new Error('timeout');
    const error = new AiProviderError('provider failed', 'anthropic', {
      statusCode: 503,
      cause: underlying,
    });
    expect(error.statusCode).toBe(503);
    expect(error.cause).toBe(underlying);
    expect(error.provider).toBe('anthropic');
    expect(error.message).toBe('provider failed');
  });
});
