import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadConfig } from '@/core/config.js';

const REQUIRED_ENV: NodeJS.ProcessEnv = {
  GMAIL_CLIENT_ID: 'client-id',
  GMAIL_CLIENT_SECRET: 'client-secret',
  GMAIL_REDIRECT_URI: 'http://localhost/oauth2'
};

const missingDotenvPath = (): string =>
  join(
    tmpdir(),
    `gmail-sweeper-no-dotenv-${Date.now()}-${Math.random().toString(16).slice(2)}.env`
  );

describe('configuration loader', () => {
  it('should load defaults and override with env', () => {
    const defaults = loadConfig(REQUIRED_ENV, { dotenvPath: missingDotenvPath() });

    expect(defaults.logLevel).toBe('info');
    expect(defaults.dbPath).toBe('data/local.db');

    const overridden = loadConfig(
      {
        ...REQUIRED_ENV,
        LOG_LEVEL: 'warn',
        DB_PATH: 'tmp/test.db'
      },
      { dotenvPath: missingDotenvPath() }
    );

    expect(overridden.logLevel).toBe('warn');
    expect(overridden.dbPath).toBe('tmp/test.db');
  });

  it('should validate required config keys', () => {
    expect(() =>
      loadConfig({
        GMAIL_CLIENT_SECRET: 'client-secret',
        GMAIL_REDIRECT_URI: 'http://localhost/oauth2'
      }, { dotenvPath: missingDotenvPath() })
    ).toThrow('gmailClientId');
  });

  it('should surface missing config with clear error', () => {
    expect(() => loadConfig({}, { dotenvPath: missingDotenvPath() })).toThrow(
      'Missing required config: gmailClientId, gmailClientSecret, gmailRedirectUri'
    );
  });

  it('should load required config keys from .env file', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-config-'));
    const dotenvPath = join(tempDir, '.env');
    await writeFile(
      dotenvPath,
      [
        'GMAIL_CLIENT_ID=file-client-id',
        'GMAIL_CLIENT_SECRET=file-client-secret',
        'GMAIL_REDIRECT_URI=http://localhost/from-file',
        'DB_PATH=data/from-file.db'
      ].join('\n'),
      'utf8'
    );

    try {
      const config = loadConfig({}, { dotenvPath });
      expect(config.gmailClientId).toBe('file-client-id');
      expect(config.gmailClientSecret).toBe('file-client-secret');
      expect(config.gmailRedirectUri).toBe('http://localhost/from-file');
      expect(config.dbPath).toBe('data/from-file.db');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('should allow process env to override .env values', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-config-'));
    const dotenvPath = join(tempDir, '.env');
    await writeFile(
      dotenvPath,
      [
        'GMAIL_CLIENT_ID=file-client-id',
        'GMAIL_CLIENT_SECRET=file-client-secret',
        'GMAIL_REDIRECT_URI=http://localhost/from-file'
      ].join('\n'),
      'utf8'
    );

    try {
      const config = loadConfig(
        {
          GMAIL_CLIENT_ID: 'env-client-id',
          GMAIL_CLIENT_SECRET: 'env-client-secret',
          GMAIL_REDIRECT_URI: 'http://localhost/from-env'
        },
        { dotenvPath }
      );
      expect(config.gmailClientId).toBe('env-client-id');
      expect(config.gmailClientSecret).toBe('env-client-secret');
      expect(config.gmailRedirectUri).toBe('http://localhost/from-env');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
