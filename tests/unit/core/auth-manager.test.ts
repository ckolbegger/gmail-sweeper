/**
 * Unit tests for AuthManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthManager } from '../../../src/core/services/auth-manager.js';

const getTokenMock = vi.fn(() =>
  Promise.resolve({
    tokens: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  })
);

// Mock keyring
vi.mock('@napi-rs/keyring', () => ({
  Entry: vi.fn().mockImplementation(() => ({
    getPassword: vi.fn(),
    setPassword: vi.fn(),
    deletePassword: vi.fn(),
  })),
}));

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/auth'),
        getToken: getTokenMock,
        refreshAccessToken: vi.fn(() =>
          Promise.resolve({
            credentials: {
              access_token: 'new-access-token',
              refresh_token: 'test-refresh-token',
              expiry_date: Date.now() + 3600000,
            },
          })
        ),
        setCredentials: vi.fn(),
      })),
    },
  },
}));

describe('AuthManager', () => {
  let authManager: AuthManager;
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:8080/callback',
  };

  beforeEach(() => {
    authManager = new AuthManager(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth2 authorization URL', async () => {
      const url = await authManager.getAuthUrl();

      expect(url).toContain('accounts.google.com');
      expect(url).toContain('oauth2');
    });
  });

  describe('exchangeCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const credentials = await authManager.exchangeCode('test-auth-code');

      expect(credentials.accessToken).toBe('test-access-token');
      expect(credentials.refreshToken).toBe('test-refresh-token');
      expect(getTokenMock).toHaveBeenCalledWith('test-auth-code');
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', async () => {
      const isAuthenticated = await authManager.isAuthenticated();

      expect(isAuthenticated).toBe(false);
    });
  });

  describe('revokeAuth', () => {
    it('should revoke authentication', async () => {
      // First authenticate
      await authManager.exchangeCode('test-code');

      // Then revoke
      await expect(authManager.revokeAuth()).resolves.not.toThrow();
    });
  });
});
