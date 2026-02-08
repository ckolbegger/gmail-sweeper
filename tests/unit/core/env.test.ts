import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const originalCwd = process.cwd();
const originalEnv = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

afterEach(() => {
  process.chdir(originalCwd);
  restoreEnv();
  vi.resetModules();
});

describe('loadEnvFile', () => {
  it('loads variables from .env when present', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmail-sweep-env-'));
    writeFileSync(
      join(dir, '.env'),
      [
        'GMAIL_CLIENT_ID=test-client-id',
        'GMAIL_CLIENT_SECRET=test-client-secret',
        'GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback',
      ].join('\n')
    );
    process.chdir(dir);

    const { loadEnvFile } = await import('../../../src/core/config/env.js');
    loadEnvFile();

    expect(process.env.GMAIL_CLIENT_ID).toBe('test-client-id');
    expect(process.env.GMAIL_CLIENT_SECRET).toBe('test-client-secret');
    expect(process.env.GMAIL_REDIRECT_URI).toBe('http://localhost:3000/oauth2callback');

    rmSync(dir, { recursive: true, force: true });
  });

  it('does not overwrite existing environment variables', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmail-sweep-env-'));
    writeFileSync(
      join(dir, '.env'),
      ['GMAIL_CLIENT_ID=from-file', 'GMAIL_CLIENT_SECRET=from-file-secret'].join('\n')
    );
    process.chdir(dir);
    process.env.GMAIL_CLIENT_ID = 'already-set';

    const { loadEnvFile } = await import('../../../src/core/config/env.js');
    loadEnvFile();

    expect(process.env.GMAIL_CLIENT_ID).toBe('already-set');
    expect(process.env.GMAIL_CLIENT_SECRET).toBe('from-file-secret');

    rmSync(dir, { recursive: true, force: true });
  });

  it('ignores missing .env file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmail-sweep-env-'));
    process.chdir(dir);

    const { loadEnvFile } = await import('../../../src/core/config/env.js');
    loadEnvFile();

    expect(process.env.GMAIL_CLIENT_ID).toBe(originalEnv.GMAIL_CLIENT_ID);

    rmSync(dir, { recursive: true, force: true });
  });
});
