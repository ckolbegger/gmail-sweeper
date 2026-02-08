import { google } from 'googleapis';

import { createAuthUrl, createGmailClient } from '@/adapters/gmail/client.js';
import { listInboxEmails, type GmailReadClientLike } from '@/adapters/gmail/list_emails.js';
import { readAuthTokens, type AuthTokens, writeAuthTokens } from '@/adapters/storage/token_store.js';
import { parseCliArgs } from '@/cli/args.js';
import type { AppConfig } from '@/core/config.js';
import { loadConfig } from '@/core/config.js';
import { listEmails } from '@/services/email_list_service.js';
import { renderInboxList } from '@/tui/inbox_list.js';

type WritableLogLevel = AppConfig['logLevel'];

export interface CliDeps {
  loadConfig?: () => {
    gmailClientId: string;
    gmailClientSecret: string;
    gmailRedirectUri: string;
    logLevel: WritableLogLevel;
    dbPath: string;
  };
  readAuthTokens?: (filePath: string) => Promise<AuthTokens | null>;
  writeAuthTokens?: (filePath: string, tokens: AuthTokens) => Promise<void>;
  createAuthUrl?: (config: AppConfig) => string;
  exchangeAuthCode?: (config: AppConfig, code: string) => Promise<AuthTokens>;
  createGmailClient?: typeof createGmailClient;
  listInboxEmails?: typeof listInboxEmails;
  writeLine?: (line: string) => void;
}

function defaultCreateAuthUrl(config: AppConfig): string {
  const oauthClient = new google.auth.OAuth2(
    config.gmailClientId,
    config.gmailClientSecret,
    config.gmailRedirectUri
  );
  return createAuthUrl(oauthClient);
}

async function defaultExchangeAuthCode(config: AppConfig, code: string): Promise<AuthTokens> {
  const oauthClient = new google.auth.OAuth2(
    config.gmailClientId,
    config.gmailClientSecret,
    config.gmailRedirectUri
  );
  const result = await oauthClient.getToken(code);
  const tokens = result.tokens ?? {};

  return {
    accessToken: tokens.access_token ?? undefined,
    refreshToken: tokens.refresh_token ?? undefined,
    expiryDate: tokens.expiry_date ?? undefined
  };
}

function renderHelp(): string[] {
  return [
    'gmail-sweeper CLI (US1)',
    'Usage: npm run app -- [options]',
    '',
    'Options:',
    '  --sender <email>        Filter by sender email',
    '  --label <label>         Filter by label',
    '  --category <category>   Filter by category',
    '  --date-from <date>      Filter from date (ISO or epoch ms)',
    '  --date-to <date>        Filter to date (ISO or epoch ms)',
    '  --limit <n>             Max rendered emails (default 25)',
    '  --page-size <n>         Gmail list page size (default 50)',
    '  --page-limit <n>        Gmail list page count limit (default 5)',
    '  --token-path <path>     Auth token path (default .gmail-sweeper/tokens.json)',
    '  --auth-code <code>      OAuth authorization code to store',
    '  --print-auth-url        Print auth URL and exit',
    '  --help                  Show help'
  ];
}

export async function runInboxCli(argv: string[], deps: CliDeps = {}): Promise<number> {
  const options = parseCliArgs(argv);
  const writeLine = deps.writeLine ?? ((line: string) => console.log(line));

  if (options.help) {
    for (const line of renderHelp()) {
      writeLine(line);
    }
    return 0;
  }

  const load = deps.loadConfig ?? loadConfig;
  const readTokens = deps.readAuthTokens ?? readAuthTokens;
  const writeTokens = deps.writeAuthTokens ?? writeAuthTokens;
  const buildAuthUrl = deps.createAuthUrl ?? defaultCreateAuthUrl;
  const exchangeCode = deps.exchangeAuthCode ?? defaultExchangeAuthCode;
  const listEmailRecords = deps.listInboxEmails ?? listInboxEmails;
  const createClient = deps.createGmailClient ?? createGmailClient;

  const config = load();

  if (options.printAuthUrl) {
    writeLine(buildAuthUrl(config));
    return 0;
  }

  let tokens = await readTokens(options.tokenPath);
  if (!tokens && options.authCode) {
    tokens = await exchangeCode(config, options.authCode);
    await writeTokens(options.tokenPath, tokens);
    writeLine(`Saved auth tokens to ${options.tokenPath}`);
  }

  if (!tokens) {
    writeLine('No saved Gmail session found.');
    writeLine('Open this URL in your browser and grant access:');
    writeLine(buildAuthUrl(config));
    writeLine('Re-run with --auth-code "<code>"');
    return 1;
  }

  const gmail = createClient({
    clientId: config.gmailClientId,
    clientSecret: config.gmailClientSecret,
    redirectUri: config.gmailRedirectUri,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  }) as GmailReadClientLike;

  const emails = await listEmailRecords(gmail, {
    pageLimit: options.pageLimit,
    pageSize: options.pageSize
  });
  const filtered = listEmails(emails, {
    sender: options.sender,
    label: options.label,
    category: options.category,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo
  });
  const visible = filtered.slice(0, options.limit);
  const lines = renderInboxList(visible);

  writeLine(`Loaded ${emails.length} emails, showing ${visible.length}.`);
  for (const line of lines) {
    writeLine(line);
  }

  return 0;
}
