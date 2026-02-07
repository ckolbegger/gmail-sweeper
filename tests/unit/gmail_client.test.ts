import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  createAuthUrl,
  createGmailClient,
  GMAIL_SCOPES,
  getGmailClient,
  resetGmailClientCache,
  type GoogleApiLike,
  type OAuth2Like
} from '@/adapters/gmail/client.js';
import { GmailError } from '@/core/errors.js';

const baseConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'http://localhost/oauth2'
};

afterEach(() => {
  resetGmailClientCache();
});

describe('Gmail adapter client', () => {
  it('should initialize with least-privilege scopes', () => {
    const oauthClient: OAuth2Like = {
      setCredentials: () => undefined,
      generateAuthUrl: vi.fn().mockReturnValue('http://auth')
    };

    const url = createAuthUrl(oauthClient);

    expect(url).toBe('http://auth');
    expect(GMAIL_SCOPES).toEqual(['https://www.googleapis.com/auth/gmail.readonly']);
    expect(oauthClient.generateAuthUrl).toHaveBeenCalledWith({
      access_type: 'offline',
      scope: GMAIL_SCOPES
    });
  });

  it('should handle auth failures gracefully', () => {
    class OAuth2Failure implements OAuth2Like {
      constructor(_clientId: string, _clientSecret: string, _redirectUri: string) {
        throw new Error('Auth failed');
      }
      setCredentials(): void {}
      generateAuthUrl(): string {
        return '';
      }
    }

    const googleApi: GoogleApiLike = {
      auth: {
        OAuth2: OAuth2Failure
      },
      gmail: () => ({})
    };

    expect(() => createGmailClient(baseConfig, { googleApi })).toThrow(GmailError);
  });

  it('should expose a reusable client instance', () => {
    const oauthClient: OAuth2Like = {
      setCredentials: vi.fn(),
      generateAuthUrl: vi.fn().mockReturnValue('http://auth')
    };

    const gmailInstance = { users: {} };
    class OAuth2Mock implements OAuth2Like {
      constructor(_clientId: string, _clientSecret: string, _redirectUri: string) {}
      setCredentials = oauthClient.setCredentials;
      generateAuthUrl = oauthClient.generateAuthUrl;
    }

    const googleApi: GoogleApiLike = {
      auth: {
        OAuth2: OAuth2Mock
      },
      gmail: () => gmailInstance
    };

    const first = getGmailClient(baseConfig, { googleApi });
    const second = getGmailClient(baseConfig, { googleApi });

    expect(first).toBe(gmailInstance);
    expect(second).toBe(gmailInstance);
  });
});
