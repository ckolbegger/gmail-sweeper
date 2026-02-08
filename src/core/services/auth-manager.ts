/**
 * Auth Manager
 *
 * Handles OAuth2 authentication flow for Gmail API.
 * Stores tokens securely using OS keyring.
 */

import { google } from 'googleapis';
import { Entry } from '@napi-rs/keyring';
import type {
  AuthCredentials,
  AuthManager as AuthManagerContract,
  GmailClientConfig,
} from '../contracts/gmail-api.js';
import { GmailError as GmailErrorClass } from '../errors/index.js';

const KEYRING_SERVICE = 'gmail-sweep';
const KEYRING_ACCOUNT = 'oauth-tokens';

export class AuthManager implements AuthManagerContract {
  private oauth2Client: any;
  private credentials: AuthCredentials | null = null;
  private keyring: Entry;

  constructor(private readonly config: GmailClientConfig) {
    this.keyring = new Entry(KEYRING_SERVICE, KEYRING_ACCOUNT);
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.loadCredentials();
      if (!tokens || !tokens.accessToken) {
        return false;
      }

      // Check if token is expired
      if (tokens.expiryDate && Date.now() >= tokens.expiryDate) {
        // Try to refresh
        if (tokens.refreshToken) {
          await this.refreshAccessToken();
          return true;
        }
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  async getAuthUrl(): Promise<string> {
    const scopes = this.config.scopes || [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<AuthCredentials> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new GmailErrorClass('INVALID_REQUEST', 'No access token returned');
      }

      const credentials: AuthCredentials = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date ? Number(tokens.expiry_date) : undefined,
      };

      await this.saveCredentials(credentials);
      this.credentials = credentials;

      return credentials;
    } catch (error) {
      throw new GmailErrorClass(
        'AUTH_REQUIRED',
        'Failed to exchange authorization code',
        error as Error
      );
    }
  }

  /**
   * Get valid access token (refreshing if necessary)
   */
  async getAccessToken(): Promise<string> {
    if (!this.credentials) {
      this.credentials = await this.loadCredentials();
    }

    if (!this.credentials) {
      throw new GmailErrorClass('AUTH_REQUIRED', 'Not authenticated');
    }

    // Check if token needs refresh
    if (this.credentials.expiryDate && Date.now() >= this.credentials.expiryDate - 60000) {
      await this.refreshAccessToken();
    }

    return this.credentials.accessToken;
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.credentials?.refreshToken) {
      throw new GmailErrorClass('AUTH_EXPIRED', 'No refresh token available');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: this.credentials.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new GmailErrorClass('AUTH_EXPIRED', 'Failed to refresh access token');
      }

      const newCredentials: AuthCredentials = {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || this.credentials.refreshToken,
        expiryDate: credentials.expiry_date ? Number(credentials.expiry_date) : undefined,
      };

      await this.saveCredentials(newCredentials);
      this.credentials = newCredentials;
    } catch (error) {
      throw new GmailErrorClass('AUTH_EXPIRED', 'Failed to refresh access token', error as Error);
    }
  }

  /**
   * Revoke authentication
   */
  async revokeAuth(): Promise<void> {
    try {
      this.keyring.deletePassword();
      this.credentials = null;
    } catch (error) {
      throw new GmailErrorClass('UNKNOWN', 'Failed to revoke authentication', error as Error);
    }
  }

  /**
   * Listen for token refresh events (no-op for now, can be extended)
   */
  onTokenRefresh(_handler: (credentials: AuthCredentials) => void): void {
    // Can be extended to emit events when tokens are refreshed
  }

  /**
   * Save credentials to OS keyring
   */
  private async saveCredentials(credentials: AuthCredentials): Promise<void> {
    const data = JSON.stringify(credentials);
    this.keyring.setPassword(data);
  }

  /**
   * Load credentials from OS keyring
   */
  private async loadCredentials(): Promise<AuthCredentials | null> {
    try {
      const data = this.keyring.getPassword();
      if (!data) {
        return null;
      }
      return JSON.parse(data) as AuthCredentials;
    } catch {
      return null;
    }
  }
}
