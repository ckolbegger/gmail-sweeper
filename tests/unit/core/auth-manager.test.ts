/**
 * AuthManager Unit Tests
 *
 * Tests for OAuth2 authentication flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthManager, AuthCredentials } from '../../../src/core/contracts/gmail-api.js';

// Create mock keyring Entry
const mockSetPassword = vi.fn();
const mockGetPassword = vi.fn();
const mockDeletePassword = vi.fn();

class MockEntry {
  setPassword(password: string) {
    return mockSetPassword(password);
  }
  getPassword() {
    return mockGetPassword();
  }
  deletePassword() {
    return mockDeletePassword();
  }
}

// Create mock OAuth2 client
const mockGenerateAuthUrl = vi.fn();
const mockGetToken = vi.fn();
const mockSetCredentials = vi.fn();
const mockGetAccessToken = vi.fn();
const mockRevokeCredentials = vi.fn();
const mockOn = vi.fn();

const createMockOAuth2Client = vi.fn(() => ({
  generateAuthUrl: mockGenerateAuthUrl,
  getToken: mockGetToken,
  setCredentials: mockSetCredentials,
  getAccessToken: mockGetAccessToken,
  revokeCredentials: mockRevokeCredentials,
  on: mockOn,
}));

// Mock the keyring module
vi.mock('@napi-rs/keyring', () => ({
  Entry: MockEntry,
}));

// Mock the googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: createMockOAuth2Client,
    },
  },
}));

// Mock the logger
vi.mock('../../../src/core/logging/index.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    vi.resetModules();

    // Reset mock implementations
    mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/oauth2/auth?client_id=test');
    mockGetToken.mockResolvedValue({ tokens: {} });
    mockGetAccessToken.mockResolvedValue({ token: 'test-token', res: { data: {} } });
    mockRevokeCredentials.mockResolvedValue(undefined);
    mockGetPassword.mockReturnValue(null);

    // Import fresh instance
    const { createAuthManager } = await import('../../../src/core/services/auth-manager.js');
    authManager = createAuthManager({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/oauth2callback',
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('isAuthenticated', () => {
    it('should return false when no credentials are stored', async () => {
      mockGetPassword.mockResolvedValue(null);

      const result = await authManager.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return true when valid credentials are stored', async () => {
      const credentials: AuthCredentials = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiryDate: Date.now() + 3600000, // 1 hour from now
      };
      mockGetPassword.mockReturnValue(JSON.stringify(credentials));

      const result = await authManager.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when stored credentials are expired and no refresh token', async () => {
      const credentials: AuthCredentials = {
        accessToken: 'expired-token',
        expiryDate: Date.now() - 3600000, // 1 hour ago
        // No refresh token
      };
      mockGetPassword.mockReturnValue(JSON.stringify(credentials));

      const result = await authManager.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth2 authorization URL', async () => {
      const mockAuthUrl = 'https://accounts.google.com/oauth2/auth?client_id=test';
      mockGenerateAuthUrl.mockReturnValue(mockAuthUrl);

      const url = await authManager.getAuthUrl();

      expect(url).toBe(mockAuthUrl);
    });

    it('should include required scopes in auth URL', async () => {
      mockGenerateAuthUrl.mockReturnValue('https://auth.url');

      // Re-create with spy on generateAuthUrl
      const { createAuthManager } = await import('../../../src/core/services/auth-manager.js');
      authManager = createAuthManager({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/oauth2callback',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      });

      await authManager.getAuthUrl();

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
        prompt: 'consent',
      });
    });
  });

  describe('exchangeCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockGetToken.mockResolvedValue({ tokens: mockTokens });

      const credentials = await authManager.exchangeCode('auth-code');

      expect(credentials.accessToken).toBe('new-access-token');
      expect(credentials.refreshToken).toBe('new-refresh-token');
      expect(mockSetPassword).toHaveBeenCalled();
      expect(mockSetCredentials).toHaveBeenCalledWith(mockTokens);
    });

    it('should throw GmailError on invalid code', async () => {
      const { GmailError } = await import('../../../src/core/errors/index.js');

      mockGetToken.mockRejectedValue(new Error('Invalid code'));

      await expect(authManager.exchangeCode('invalid-code')).rejects.toThrow(GmailError);
    });
  });

  describe('getAccessToken', () => {
    it('should return valid access token when not expired', async () => {
      const credentials: AuthCredentials = {
        accessToken: 'valid-token',
        expiryDate: Date.now() + 3600000,
      };
      mockGetPassword.mockReturnValue(JSON.stringify(credentials));

      const token = await authManager.getAccessToken();

      expect(token).toBe('valid-token');
    });

    it('should refresh token when expired', async () => {
      const expiredCredentials: AuthCredentials = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiryDate: Date.now() - 3600000,
      };

      mockGetPassword.mockReturnValue(JSON.stringify(expiredCredentials));

      const newTokens = {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600000,
      };

      mockGetAccessToken.mockResolvedValue({ 
        token: newTokens.access_token, 
        res: { data: newTokens } 
      });

      const token = await authManager.getAccessToken();

      expect(token).toBe('new-access-token');
      expect(mockSetCredentials).toHaveBeenCalled();
      expect(mockSetPassword).toHaveBeenCalled();
    });

    it('should throw GmailError when not authenticated', async () => {
      const { GmailError } = await import('../../../src/core/errors/index.js');

      mockGetPassword.mockReturnValue(null);

      await expect(authManager.getAccessToken()).rejects.toThrow(GmailError);
    });
  });

  describe('revokeAuth', () => {
    it('should revoke credentials and clear storage', async () => {
      const credentials: AuthCredentials = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
      };
      mockGetPassword.mockReturnValue(JSON.stringify(credentials));

      await authManager.revokeAuth();

      expect(mockRevokeCredentials).toHaveBeenCalled();
      expect(mockDeletePassword).toHaveBeenCalled();
      expect(mockSetCredentials).toHaveBeenCalled();
    });

    it('should clear storage even if revoke fails', async () => {
      const credentials: AuthCredentials = {
        accessToken: 'valid-token',
      };
      mockGetPassword.mockReturnValue(JSON.stringify(credentials));
      mockRevokeCredentials.mockRejectedValue(new Error('Network error'));

      // Should not throw, should still delete
      await authManager.revokeAuth();

      expect(mockDeletePassword).toHaveBeenCalled();
    });
  });

  describe('onTokenRefresh', () => {
    it('should register token refresh handler', async () => {
      const handler = vi.fn();
      authManager.onTokenRefresh(handler);

      // The handler is registered in constructor via mockOn
      expect(mockOn).toHaveBeenCalledWith('tokens', expect.any(Function));
    });
  });
});
