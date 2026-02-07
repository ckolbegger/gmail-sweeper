import { describe, expect, it } from 'vitest';

import { loadConfig } from '@/core/config.js';

const REQUIRED_ENV: NodeJS.ProcessEnv = {
  GMAIL_CLIENT_ID: 'client-id',
  GMAIL_CLIENT_SECRET: 'client-secret',
  GMAIL_REDIRECT_URI: 'http://localhost/oauth2'
};

describe('configuration loader', () => {
  it('should load defaults and override with env', () => {
    const defaults = loadConfig(REQUIRED_ENV);

    expect(defaults.logLevel).toBe('info');
    expect(defaults.dbPath).toBe('data/local.db');

    const overridden = loadConfig({
      ...REQUIRED_ENV,
      LOG_LEVEL: 'warn',
      DB_PATH: 'tmp/test.db'
    });

    expect(overridden.logLevel).toBe('warn');
    expect(overridden.dbPath).toBe('tmp/test.db');
  });

  it('should validate required config keys', () => {
    expect(() =>
      loadConfig({
        GMAIL_CLIENT_SECRET: 'client-secret',
        GMAIL_REDIRECT_URI: 'http://localhost/oauth2'
      })
    ).toThrow('gmailClientId');
  });

  it('should surface missing config with clear error', () => {
    expect(() => loadConfig({})).toThrow(
      'Missing required config: gmailClientId, gmailClientSecret, gmailRedirectUri'
    );
  });
});
