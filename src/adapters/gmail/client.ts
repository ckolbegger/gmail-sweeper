import { google } from 'googleapis';

import { GmailError } from '@/core/errors.js';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

export interface GmailClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface OAuth2Like {
  setCredentials: (creds: { access_token?: string; refresh_token?: string }) => void;
  generateAuthUrl: (options: { access_type: 'offline'; scope: string[] }) => string;
}

export interface GoogleApiLike {
  auth: {
    OAuth2: new (clientId: string, clientSecret: string, redirectUri: string) => OAuth2Like;
  };
  gmail: (options: { version: 'v1'; auth: OAuth2Like }) => unknown;
}

let cachedClient: unknown | null = null;

export function createAuthUrl(oauthClient: OAuth2Like): string {
  return oauthClient.generateAuthUrl({ access_type: 'offline', scope: GMAIL_SCOPES });
}

export function createGmailClient(config: GmailClientConfig, deps: { googleApi?: GoogleApiLike } = {}) {
  const googleApi = deps.googleApi ?? (google as unknown as GoogleApiLike);

  try {
    const oauthClient = new googleApi.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauthClient.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken
    });

    return googleApi.gmail({ version: 'v1', auth: oauthClient });
  } catch (error) {
    throw new GmailError('Failed to initialize Gmail client', {
      cause: error instanceof Error ? error.message : error
    });
  }
}

export function getGmailClient(config: GmailClientConfig, deps: { googleApi?: GoogleApiLike } = {}) {
  if (!cachedClient) {
    cachedClient = createGmailClient(config, deps);
  }

  return cachedClient;
}

export function resetGmailClientCache(): void {
  cachedClient = null;
}
