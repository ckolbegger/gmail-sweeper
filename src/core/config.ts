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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config: AppConfig = {
    gmailClientId: env.GMAIL_CLIENT_ID ?? '',
    gmailClientSecret: env.GMAIL_CLIENT_SECRET ?? '',
    gmailRedirectUri: env.GMAIL_REDIRECT_URI ?? '',
    logLevel: (env.LOG_LEVEL as LogLevel) ?? 'info',
    dbPath: env.DB_PATH ?? 'data/local.db'
  };

  const missing = REQUIRED_KEYS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }

  return config;
}
