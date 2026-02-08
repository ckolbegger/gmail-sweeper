/**
 * T018, T020: OAuth2 authentication for Gmail API.
 */

import { google, type Auth } from 'googleapis';
import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import { AuthenticationError } from '../errors.js';

/** Gmail API scopes required for the application */
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

/** Buffer time before expiry to refresh token (5 minutes) */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/** Token file name */
const TOKEN_FILE = 'token.json';

/**
 * OAuth2 client credentials configuration.
 */
export interface OAuth2Credentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Stored token structure.
 */
export interface StoredToken {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type?: string;
  scope?: string;
}

/**
 * Exchange code request parameters.
 */
export interface ExchangeCodeParams extends OAuth2Credentials {
  code: string;
}

/**
 * Refresh token request parameters.
 */
export interface RefreshTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * Creates an OAuth2 client with the provided credentials.
 */
export function createOAuth2Client(credentials: OAuth2Credentials): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret,
    credentials.redirectUri
  );
}

/**
 * T017: Generates an authorization URL for OAuth2 consent flow.
 * @param credentials - OAuth2 client credentials
 * @returns Authorization URL to redirect user to
 */
export function generateAuthUrl(credentials: OAuth2Credentials): string {
  const oauth2Client = createOAuth2Client(credentials);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // Force to get refresh token
  });
}

/**
 * T017: Exchanges an authorization code for access and refresh tokens.
 * @param params - Exchange parameters including auth code
 * @returns Token object with access_token, refresh_token, and expiry_date
 * @throws AuthenticationError on failure
 */
export async function exchangeCodeForTokens(params: ExchangeCodeParams): Promise<StoredToken> {
  const oauth2Client = createOAuth2Client({
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    redirectUri: params.redirectUri,
  });

  try {
    const { tokens } = await oauth2Client.getToken(params.code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new AuthenticationError('Failed to obtain tokens: missing access or refresh token');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ?? Date.now() + 3600000,
      token_type: tokens.token_type ?? 'Bearer',
      scope: tokens.scope ?? GMAIL_SCOPES.join(' '),
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('invalid_grant') || message.includes('invalid_code')) {
      throw new AuthenticationError(`Invalid authorization code: ${message}`);
    }

    if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
      throw new AuthenticationError(`Authentication timed out: ${message}`);
    }

    if (message.includes('ENOTFOUND') || message.includes('network')) {
      throw new AuthenticationError(`Network error during authentication: ${message}`);
    }

    throw new AuthenticationError(`Failed to exchange code for tokens: ${message}`);
  }
}

/**
 * T019: Checks if a token is expired or about to expire.
 * @param token - Token to check
 * @returns true if token is expired or expires within 5 minutes
 */
export function isTokenExpired(token: StoredToken): boolean {
  if (!token.expiry_date) {
    return true;
  }
  return Date.now() >= token.expiry_date - TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * T019: Refreshes an access token using the refresh token.
 * @param params - Refresh parameters including refresh token
 * @returns New token object with updated access_token and expiry_date
 * @throws AuthenticationError on failure
 */
export async function refreshAccessToken(params: RefreshTokenParams): Promise<StoredToken> {
  const oauth2Client = new google.auth.OAuth2(params.clientId, params.clientSecret);

  oauth2Client.setCredentials({
    refresh_token: params.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new AuthenticationError('Failed to refresh token: no access token received');
    }

    return {
      access_token: credentials.access_token,
      refresh_token: params.refreshToken, // Keep original refresh token
      expiry_date: credentials.expiry_date ?? Date.now() + 3600000,
      token_type: credentials.token_type ?? 'Bearer',
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('invalid_grant')) {
      throw new AuthenticationError(`Refresh token is invalid or revoked: ${message}`);
    }

    throw new AuthenticationError(`Failed to refresh access token: ${message}`);
  }
}

/**
 * T020: Saves a token to the config directory.
 * @param configDir - Path to config directory
 * @param token - Token to save
 * @throws Error on file system failure
 */
export async function saveToken(configDir: string, token: StoredToken): Promise<void> {
  // Ensure directory exists
  await mkdir(configDir, { recursive: true });

  const tokenPath = join(configDir, TOKEN_FILE);
  await writeFile(tokenPath, JSON.stringify(token, null, 2), 'utf-8');
}

/**
 * T020: Loads a token from the config directory.
 * @param configDir - Path to config directory
 * @returns Token object or null if not found or invalid
 */
export async function loadToken(configDir: string): Promise<StoredToken | null> {
  const tokenPath = join(configDir, TOKEN_FILE);

  try {
    await access(tokenPath);
    const content = await readFile(tokenPath, 'utf-8');
    const token = JSON.parse(content) as StoredToken;

    // Validate required fields
    if (!token.access_token || !token.refresh_token) {
      return null;
    }

    return token;
  } catch (error) {
    // File doesn't exist or is corrupted
    if (error instanceof SyntaxError) {
      // Corrupted JSON - return null to allow re-authentication
      return null;
    }

    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return null;
    }

    // For other errors (like permission denied), re-throw
    throw error;
  }
}

/**
 * Initiates interactive OAuth2 flow with user input.
 * @param credentials - OAuth2 credentials
 * @param configDir - Config directory for token storage
 * @param inputFn - Function to get user input (authorization code)
 * @returns Token object after successful authentication
 * @throws AuthenticationError on failure
 */
export async function interactiveOAuthFlow(
  credentials: OAuth2Credentials,
  configDir: string,
  inputFn: (prompt: string) => Promise<string>
): Promise<StoredToken> {
  // Validate credentials
  if (!credentials.clientId || !credentials.clientSecret) {
    throw new AuthenticationError('Missing OAuth2 credentials: clientId and clientSecret are required');
  }

  // Generate auth URL
  const authUrl = generateAuthUrl(credentials);

  // Display URL to user and get authorization code
  console.log('\n🔐 Gmail authentication required\n');
  console.log('Please visit this URL to authorize the application:');
  console.log(`\n${authUrl}\n`);

  const code = await inputFn('Enter the authorization code: ');

  if (!code) {
    throw new AuthenticationError('Authorization code is required');
  }

  // Exchange code for tokens
  const token = await exchangeCodeForTokens({
    ...credentials,
    code,
  });

  // Save token for future use
  await saveToken(configDir, token);

  console.log('✅ Authentication successful! Token saved.\n');

  return token;
}

/**
 * Gets an authenticated OAuth2 client, refreshing the token if needed.
 * @param credentials - OAuth2 credentials
 * @param configDir - Config directory for token storage
 * @param inputFn - Optional function to get user input for interactive auth
 * @returns Authenticated OAuth2 client
 * @throws AuthenticationError if no valid token exists and inputFn not provided
 */
export async function getAuthenticatedClient(
  credentials: OAuth2Credentials,
  configDir: string,
  inputFn?: (prompt: string) => Promise<string>
): Promise<Auth.OAuth2Client> {
  let token = await loadToken(configDir);

  if (!token) {
    if (inputFn) {
      // Interactive OAuth flow
      token = await interactiveOAuthFlow(credentials, configDir, inputFn);
    } else {
      throw new AuthenticationError('No stored token found. Please authenticate first.');
    }
  }

  // Refresh if expired
  if (isTokenExpired(token)) {
    token = await refreshAccessToken({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      refreshToken: token.refresh_token,
    });
    await saveToken(configDir, token);
  }

  const oauth2Client = createOAuth2Client(credentials);
  oauth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  });

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.refresh_token) {
      token = {
        access_token: newTokens.access_token ?? token!.access_token,
        refresh_token: newTokens.refresh_token,
        expiry_date: newTokens.expiry_date ?? Date.now() + 3600000,
      };
    } else if (newTokens.access_token) {
      token = {
        ...token!,
        access_token: newTokens.access_token,
        expiry_date: newTokens.expiry_date ?? Date.now() + 3600000,
      };
    }
    await saveToken(configDir, token!);
  });

  return oauth2Client;
}
