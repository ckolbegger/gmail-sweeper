/**
 * T012: Core library barrel export.
 * Re-exports all public APIs from the core library.
 */

// Models
export type {
  Email,
  EmailAddress,
  Label,
  LabelType,
  Category,
  Action,
  ClassificationResult,
  NaturalLanguageQuery,
  SavedQuery,
  Config,
  UserSession,
  MessageListOptions,
  MessageListResult,
  BatchResult,
  EmailCacheOptions,
  SearchResult,
  ActionResult,
} from './models/index.js';

export { DEFAULT_CONFIG } from './models/index.js';

// Errors
export {
  GmailSweepError,
  AuthenticationError,
  GmailAPIError,
  RateLimitError,
  NotFoundError,
  ClassificationError,
  ConfirmationRequired,
  ConfigurationError,
  CacheError,
} from './errors.js';

// Gmail client
export { GmailClient } from './gmail/client.js';
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
} from './gmail/auth.js';

// Cache
export { EmailCache } from './cache/db.js';

// Config
export {
  loadConfig,
  createDefaultConfig,
  saveConfig,
  validateConfig,
  getConfigPath,
  CONFIG_FILE,
  DEFAULT_CONFIG_DIR,
} from './config.js';

// Search (Phase 5 - US3)
// export { EmailClassifier } from './search/classifier.js';
// export { ClaudeClassifier } from './search/claude.js';
// export { SearchEngine } from './search/engine.js';

// Actions (Phase 6 - US4)
// export { ActionExecutor } from './actions/executor.js';
