/**
 * T021, T025: Unit tests for GmailClient.
 * Note: Full integration tests require mocked Google APIs.
 * These tests focus on the client's internal logic.
 */

import { describe, it, expect } from 'vitest';
import { GmailClient } from '../../../src/core/gmail/client.js';
import { AuthenticationError } from '../../../src/core/errors.js';

describe('GmailClient', () => {
  describe('T022: Constructor', () => {
    it('should create client with account and config dir', () => {
      const client = new GmailClient('test@gmail.com', '/tmp/test-config');
      expect(client.account).toBe('test@gmail.com');
    });
  });

  describe('T023: authenticate', () => {
    it('should throw AuthenticationError when not configured', async () => {
      const client = new GmailClient('test@gmail.com', '/tmp/nonexistent');

      // Without credentials file, should throw AuthenticationError
      await expect(client.authenticate()).rejects.toThrow(AuthenticationError);
    });
  });

  describe('T024: listMessages', () => {
    it('should throw AuthenticationError when not authenticated', async () => {
      const client = new GmailClient('test@gmail.com', '/tmp/test-config');

      await expect(client.listMessages()).rejects.toThrow(AuthenticationError);
      await expect(client.listMessages()).rejects.toThrow(
        /Gmail client not authenticated/
      );
    });
  });

  describe('getMessage', () => {
    it('should throw AuthenticationError when not authenticated', async () => {
      const client = new GmailClient('test@gmail.com', '/tmp/test-config');

      await expect(client.getMessage('msg-id')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('modifyLabels', () => {
    it('should throw AuthenticationError when not authenticated', async () => {
      const client = new GmailClient('test@gmail.com', '/tmp/test-config');

      await expect(
        client.modifyLabels(['msg1'], { addLabels: ['Label_1'] })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('archive', () => {
    it('should throw AuthenticationError when not authenticated', async () => {
      const client = new GmailClient('test@gmail.com', '/tmp/test-config');

      await expect(client.archive(['msg1'])).rejects.toThrow(AuthenticationError);
    });
  });

  describe('trash', () => {
    it('should throw AuthenticationError when not authenticated', async () => {
      const client = new GmailClient('test@gmail.com', '/tmp/test-config');

      await expect(client.trash(['msg1'])).rejects.toThrow(AuthenticationError);
    });
  });

  describe('listLabels', () => {
    it('should throw AuthenticationError when not authenticated', async () => {
      const client = new GmailClient('test@gmail.com', '/tmp/test-config');

      await expect(client.listLabels()).rejects.toThrow(AuthenticationError);
    });
  });
});
