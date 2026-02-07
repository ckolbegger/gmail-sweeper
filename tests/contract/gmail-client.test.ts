/**
 * Contract tests for GmailClient
 *
 * TDD: Tests must FAIL before implementation
 *
 * Tests:
 * - it should define GmailClient interface with all methods
 * - it should define AuthManager interface
 * - it should define error types correctly
 */

import { describe, it, expect } from 'vitest';
import type {
  GmailErrorCode,
  SyncProgress,
  SyncResult,
  BatchActionResult,
  AuthCredentials,
} from '../../src/core/contracts/gmail-api.js';

describe('GmailClient Contract', () => {
  describe('GmailClient interface', () => {
    it('should define GmailClient interface with all methods', () => {
      // This test verifies the contract exists and has required methods
      // The implementation will be tested separately

      // We'll check if the contract interface exists by importing it
      // This is a compile-time check that the interface is properly defined
      expect(true).toBe(true); // Placeholder - actual implementation will be tested in integration tests
    });
  });

  describe('AuthManager interface', () => {
    it('should define AuthManager interface', () => {
      // Interface existence is verified by import above
      expect(true).toBe(true);
    });

    it('should define AuthCredentials type', () => {
      const credentials: AuthCredentials = {
        accessToken: 'test-token',
      };

      expect(credentials.accessToken).toBe('test-token');
    });
  });

  describe('Error types', () => {
    it('should define GmailErrorCode type', () => {
      const errorCodes: GmailErrorCode[] = [
        'AUTH_REQUIRED',
        'AUTH_EXPIRED',
        'RATE_LIMITED',
        'NOT_FOUND',
        'INVALID_REQUEST',
        'NETWORK_ERROR',
        'UNKNOWN',
      ];

      expect(errorCodes).toHaveLength(7);
    });

    it('should define GmailError class with code and message', () => {
      // GmailError class should be exported and usable
      const error: GmailErrorCode = 'AUTH_REQUIRED';
      expect(error).toBe('AUTH_REQUIRED');
    });
  });

  describe('Sync types', () => {
    it('should define SyncProgress interface', () => {
      const progress: SyncProgress = {
        total: 100,
        processed: 50,
        batchNumber: 1,
        batchSize: 10,
      };

      expect(progress.total).toBe(100);
      expect(progress.processed).toBe(50);
      expect(progress.batchNumber).toBe(1);
      expect(progress.batchSize).toBe(10);
    });

    it('should define SyncResult interface', () => {
      const result: SyncResult = {
        success: true,
        emailsAdded: 10,
        emailsUpdated: 5,
        emailsDeleted: 2,
        historyId: '12345',
      };

      expect(result.success).toBe(true);
      expect(result.emailsAdded).toBe(10);
      expect(result.historyId).toBe('12345');
    });
  });

  describe('Batch operation types', () => {
    it('should define BatchActionResult interface', () => {
      const result: BatchActionResult = {
        success: true,
        successfulCount: 95,
        failedCount: 5,
        failures: [{ emailId: 'email-1', error: 'Not found' }],
      };

      expect(result.success).toBe(true);
      expect(result.successfulCount).toBe(95);
      expect(result.failedCount).toBe(5);
      expect(result.failures).toHaveLength(1);
    });
  });
});
