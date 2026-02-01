/**
 * T017, T019, T020: Unit tests for OAuth2 authentication flow.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  loadToken,
  saveToken,
  isTokenExpired,
  type StoredToken,
} from '../../../src/core/gmail/auth.js';

describe('OAuth2 Authentication', () => {
  let testConfigDir: string;

  beforeEach(async () => {
    testConfigDir = join(tmpdir(), `gmail-sweep-test-${Date.now()}`);
    await mkdir(testConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testConfigDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe('T019: isTokenExpired', () => {
    it('should return false if token is not expired', () => {
      const token: StoredToken = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 3600000, // 1 hour from now
      };

      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true if token is expired', () => {
      const token: StoredToken = {
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() - 1000, // 1 second ago
      };

      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return true if token expires within 5 minutes (boundary)', () => {
      const tokenExpiringIn4Min: StoredToken = {
        access_token: 'expiring-soon',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 4 * 60 * 1000, // 4 minutes from now
      };

      const tokenExpiringIn6Min: StoredToken = {
        access_token: 'still-valid',
        refresh_token: 'refresh-token',
        expiry_date: Date.now() + 6 * 60 * 1000, // 6 minutes from now
      };

      expect(isTokenExpired(tokenExpiringIn4Min)).toBe(true); // Should refresh
      expect(isTokenExpired(tokenExpiringIn6Min)).toBe(false); // Still valid
    });
  });

  describe('T020: Token Persistence', () => {
    it('should save token to config directory', async () => {
      const token: StoredToken = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      await saveToken(testConfigDir, token);

      const tokenPath = join(testConfigDir, 'token.json');
      await expect(access(tokenPath)).resolves.toBeUndefined();
    });

    it('should load token from config directory', async () => {
      const token: StoredToken = {
        access_token: 'loaded-access-token',
        refresh_token: 'loaded-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      await saveToken(testConfigDir, token);
      const loaded = await loadToken(testConfigDir);

      expect(loaded).not.toBeNull();
      expect(loaded?.access_token).toBe('loaded-access-token');
      expect(loaded?.refresh_token).toBe('loaded-refresh-token');
    });

    it('should create config directory if not exists', async () => {
      const newDir = join(testConfigDir, 'nested', 'path');
      const token: StoredToken = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expiry_date: Date.now() + 3600000,
      };

      await saveToken(newDir, token);

      const loaded = await loadToken(newDir);
      expect(loaded).not.toBeNull();
    });

    it('should return null if no token file exists', async () => {
      const emptyDir = join(testConfigDir, 'empty');
      await mkdir(emptyDir, { recursive: true });

      const token = await loadToken(emptyDir);
      expect(token).toBeNull();
    });

    it('should handle corrupted token file gracefully', async () => {
      const tokenPath = join(testConfigDir, 'token.json');
      await writeFile(tokenPath, 'not valid json {{{');

      const token = await loadToken(testConfigDir);
      expect(token).toBeNull();
    });
  });
});
