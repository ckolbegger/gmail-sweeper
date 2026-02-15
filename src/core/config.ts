import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { AiProviderConfig } from '@/adapters/ai/provider.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppConfig {
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRedirectUri: string;
  logLevel: LogLevel;
  dbPath: string;
}

const REQUIRED_KEYS: Array<keyof AppConfig> = [
  'gmailClientId',
  'gmailClientSecret',
  'gmailRedirectUri',
  'dbPath'
];

interface LoadConfigOptions {
  dotenvPath?: string;
}

function parseDotEnv(content: string): NodeJS.ProcessEnv {
  const parsed: NodeJS.ProcessEnv = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2] ?? '';

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function loadDotEnv(dotenvPath: string): NodeJS.ProcessEnv {
  if (!existsSync(dotenvPath)) {
    return {};
  }
  const content = readFileSync(dotenvPath, 'utf8');
  return parseDotEnv(content);
}

function parseMaxContextTokens(value: string | undefined): number {
  if (!value) {
    return 32000;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 32000;
  }

  return parsed;
}

export function resolveAiConfig(env: NodeJS.ProcessEnv = process.env): AiProviderConfig | null {
  const provider = env.AI_PROVIDER;
  const model = env.AI_MODEL;
  const apiKey = env.AI_API_KEY;

  if (!provider || !model || !apiKey) {
    return null;
  }

  if (provider !== 'anthropic' && provider !== 'openai') {
    return null;
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl: env.AI_BASE_URL || undefined,
    maxContextTokens: parseMaxContextTokens(env.AI_MAX_CONTEXT_TOKENS)
  };
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  options: LoadConfigOptions = {}
): AppConfig {
  const dotenvPath = options.dotenvPath ?? resolve(process.cwd(), '.env');
  const dotenvEnv = loadDotEnv(dotenvPath);
  const mergedEnv: NodeJS.ProcessEnv = { ...dotenvEnv, ...env };

  const config: AppConfig = {
    gmailClientId: mergedEnv.GMAIL_CLIENT_ID ?? '',
    gmailClientSecret: mergedEnv.GMAIL_CLIENT_SECRET ?? '',
    gmailRedirectUri: mergedEnv.GMAIL_REDIRECT_URI ?? '',
    logLevel: (mergedEnv.LOG_LEVEL as LogLevel) ?? 'info',
    dbPath: mergedEnv.DB_PATH ?? 'data/local.db'
  };

  const missing = REQUIRED_KEYS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }

  return config;
}
