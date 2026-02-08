import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
}

function isValidTokenPayload(value: unknown): value is AuthTokens {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const accessToken = payload.accessToken;
  const refreshToken = payload.refreshToken;
  const expiryDate = payload.expiryDate;

  const validAccess = accessToken === undefined || typeof accessToken === 'string';
  const validRefresh = refreshToken === undefined || typeof refreshToken === 'string';
  const validExpiry = expiryDate === undefined || typeof expiryDate === 'number';

  return validAccess && validRefresh && validExpiry;
}

export async function readAuthTokens(filePath: string): Promise<AuthTokens | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidTokenPayload(parsed)) {
      throw new Error(`Invalid token store payload in ${filePath}`);
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function writeAuthTokens(filePath: string, tokens: AuthTokens): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(tokens, null, 2), 'utf8');
}
