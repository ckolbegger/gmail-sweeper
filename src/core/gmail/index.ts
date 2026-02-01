/**
 * Gmail module barrel export.
 */

export { GmailClient } from './client.js';
export {
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  loadToken,
  saveToken,
  isTokenExpired,
  createOAuth2Client,
  getAuthenticatedClient,
  type OAuth2Credentials,
  type StoredToken,
  type ExchangeCodeParams,
  type RefreshTokenParams,
} from './auth.js';
