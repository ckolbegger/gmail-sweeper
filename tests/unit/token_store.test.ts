import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readAuthTokens, writeAuthTokens } from '@/adapters/storage/token_store.js';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('token store adapter', () => {
  it('should return null when token file does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-token-'));
    tempDirs.push(dir);

    const tokens = await readAuthTokens(join(dir, 'missing.json'));
    expect(tokens).toBeNull();
  });

  it('should persist access/refresh tokens to disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-token-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'session/tokens.json');

    await writeAuthTokens(filePath, {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiryDate: 1700000000000
    });

    const savedFile = await readFile(filePath, 'utf8');
    expect(savedFile).toContain('refresh');

    const restored = await readAuthTokens(filePath);
    expect(restored).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiryDate: 1700000000000
    });
  });

  it('should surface invalid token payloads with clear errors', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gmail-sweeper-token-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'tokens.json');
    await writeFile(filePath, JSON.stringify({ refreshToken: 123 }), 'utf8');

    await expect(readAuthTokens(filePath)).rejects.toThrow(
      'Invalid token store payload in'
    );
  });
});
