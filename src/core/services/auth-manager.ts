/**
 * AuthManager
 *
 * Handles OAuth2 authentication flow for Gmail API.
 */

import { google } from 'googleapis';
import { Entry } from '@napi-rs/keyring';
import type {
  AuthManager,
  AuthCredentials,
} from '../contracts/gmail-api.js';
import { GmailError } from '../errors/index.js';
import { logger } from '../logging/index.js';

// ============================================================================
// Constants
// ============================================================================

const KEYRING_SERVICE = 'gmail-sweep';
const KEYRING_ACCOUNT = 'oauth2-credentials';

function getKeyringEntry(): Entry {
  return new Entry(KEYRING_SERVICE, KEYRING_ACCOUNT);
}

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

// ============================================================================
// Types
// ============================================================================

interface AuthManagerConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

// ============================================================================
// AuthManager Implementation
// ============================================================================

export class GoogleAuthManager implements AuthManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private oauth2Client: any;
  private refreshHandlers: Array<(credentials: AuthCredentials) => void> = [];

  constructor(private config: AuthManagerConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    // Listen for token refresh events
    this.oauth2Client.on('tokens', (tokens: { access_token?: string; refresh_token?: string; expiry_date?: number }) => {
      logger.debug('Token refresh event received');
      const credentials = this.tokensToCredentials(tokens);
      this.persistCredentials(credentials).catch((error) => {
        logger.error('Failed to persist refreshed tokens', error);
      });
      // Notify listeners
      this.refreshHandlers.forEach((handler) => handler(credentials));
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const credentials = await this.loadCredentials();
      if (!credentials) {
        return false;
      }

      // Check if token is expired
      if (credentials.expiryDate && credentials.expiryDate <= Date.now()) {
        // Token expired - can we refresh?
        if (!credentials.refreshToken) {
          logger.debug('Token expired and no refresh token available');
          return false;
        }
        // Has refresh token, consider authenticated
        return true;
      }

      return true;
    } catch (error) {
      logger.error('Error checking authentication status', error);
      return false;
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  async getAuthUrl(): Promise<string> {
    const scopes = this.config.scopes || DEFAULT_SCOPES;

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
    });

    logger.debug('Generated OAuth2 authorization URL');
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<AuthCredentials> {
    try {
      logger.debug('Exchanging authorization code for tokens');
      const { tokens } = await this.oauth2Client.getToken(code);

      const credentials = this.tokensToCredentials(tokens);

      // Persist credentials
      await this.persistCredentials(credentials);

      // Set credentials on OAuth2 client
      this.oauth2Client.setCredentials(tokens);

      logger.info('Successfully exchanged authorization code for tokens');
      return credentials;
    } catch (error) {
      logger.error('Failed to exchange authorization code', error);
      throw new GmailError(
        'AUTH_EXPIRED',
        `Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get valid access token (refreshing if necessary)
   */
  async getAccessToken(): Promise<string> {
    const credentials = await this.loadCredentials();

    if (!credentials) {
      throw new GmailError('AUTH_REQUIRED', 'Not authenticated. Please run "gmail-sweep auth" first.');
    }

    // Check if token needs refresh
    if (credentials.expiryDate && credentials.expiryDate <= Date.now()) {
      if (!credentials.refreshToken) {
        throw new GmailError(
          'AUTH_EXPIRED',
          'Token expired and no refresh token available. Please re-authenticate.'
        );
      }

      // Refresh the token
      logger.debug('Refreshing expired access token');
      this.oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiryDate,
      });

      try {
        const response = await this.oauth2Client.getAccessToken();
        const newToken = response.token;
        const newRes = response.res;

        if (!newToken) {
          throw new GmailError('AUTH_EXPIRED', 'Failed to refresh access token');
        }

        // Update stored credentials with new token
        const updatedCredentials: AuthCredentials = {
          accessToken: newToken,
          refreshToken: credentials.refreshToken, // Keep the same refresh token
          expiryDate: newRes?.data.expiry_date,
        };

        await this.persistCredentials(updatedCredentials);

        logger.debug('Successfully refreshed access token');
        return newToken;
      } catch (error) {
        logger.error('Failed to refresh access token', error);
        throw new GmailError(
          'AUTH_EXPIRED',
          `Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error : undefined
        );
      }
    }

    return credentials.accessToken;
  }

  /**
   * Revoke authentication
   */
  async revokeAuth(): Promise<void> {
    try {
      const credentials = await this.loadCredentials();

      if (credentials) {
        // Set credentials on client
        this.oauth2Client.setCredentials({
          access_token: credentials.accessToken,
          refresh_token: credentials.refreshToken,
        });

        // Try to revoke credentials (best effort)
        try {
          await this.oauth2Client.revokeCredentials();
          logger.info('Successfully revoked OAuth2 credentials');
        } catch (error) {
          // Log but don't throw - we still want to clear local storage
          logger.warn('Failed to revoke credentials on Google side', error);
        }
      }

      // Clear local storage regardless of revoke success
      await this.clearCredentials();
    } catch (error) {
      // Always try to clear local storage
      await this.clearCredentials().catch(() => {
        // Ignore errors during cleanup
      });

      throw new GmailError(
        'UNKNOWN',
        `Failed to revoke authentication: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Listen for token refresh events
   */
  onTokenRefresh(handler: (credentials: AuthCredentials) => void): void {
    this.refreshHandlers.push(handler);
  }

  /**
   * Get the underlying OAuth2 client (for Gmail API usage)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOAuth2Client(): any {
    return this.oauth2Client;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load credentials from secure storage
   */
  private async loadCredentials(): Promise<AuthCredentials | null> {
    try {
      const entry = getKeyringEntry();
      const stored = entry.getPassword();
      if (!stored) {
        return null;
      }

      const credentials = JSON.parse(stored) as AuthCredentials;
      return credentials;
    } catch (error) {
      logger.error('Failed to load credentials from keyring', error);
      return null;
    }
  }

  /**
   * Persist credentials to secure storage
   */
  private async persistCredentials(credentials: AuthCredentials): Promise<void> {
    try {
      const entry = getKeyringEntry();
      const serialized = JSON.stringify(credentials);
      entry.setPassword(serialized);
      logger.debug('Credentials persisted to keyring');
    } catch (error) {
      logger.error('Failed to persist credentials to keyring', error);
      throw new GmailError(
        'UNKNOWN',
        'Failed to save credentials securely',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clear credentials from secure storage
   */
  private async clearCredentials(): Promise<void> {
    try {
      const entry = getKeyringEntry();
      entry.deletePassword();
      logger.debug('Credentials cleared from keyring');
    } catch (error) {
      logger.error('Failed to clear credentials from keyring', error);
      throw error;
    }
  }

  /**
   * Convert Google tokens to AuthCredentials
   */
  private tokensToCredentials(tokens: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  }): AuthCredentials {
    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAuthManager(config: AuthManagerConfig): AuthManager {
  return new GoogleAuthManager(config);
}
