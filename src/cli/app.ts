import { google } from 'googleapis';

import { createAiProvider, isSummaryProvider } from '@/adapters/ai/provider.js';
import { createAuthUrl, createGmailClient } from '@/adapters/gmail/client.js';
import { getEmailDetail, type GmailDetailClientLike } from '@/adapters/gmail/get_email.js';
import { listInboxEmails, type GmailReadClientLike } from '@/adapters/gmail/list_emails.js';
import {
  archiveEmail as archiveGmailEmail,
  deleteEmail as deleteGmailEmail,
  type GmailMutationClientLike
} from '@/adapters/gmail/mutate_email.js';
import { createSummaryStore } from '@/adapters/storage/summary_store.js';
import { readAuthTokens, type AuthTokens, writeAuthTokens } from '@/adapters/storage/token_store.js';
import { parseCliArgs } from '@/cli/args.js';
import type { AppConfig } from '@/core/config.js';
import { loadConfig } from '@/core/config.js';
import { listEmails } from '@/services/email_list_service.js';
import { createEmailSummaryService } from '@/services/email_summary_service.js';
import { renderEmailPreview } from '@/tui/email_preview.js';
import { renderInboxList } from '@/tui/inbox_list.js';
import { runInkSession, type RunInkSessionOptions } from '@/tui/ink_runtime.js';

export interface CliDeps {
  loadConfig?: () => AppConfig;
  readAuthTokens?: (filePath: string) => Promise<AuthTokens | null>;
  writeAuthTokens?: (filePath: string, tokens: AuthTokens) => Promise<void>;
  createAuthUrl?: (config: AppConfig) => string;
  exchangeAuthCode?: (config: AppConfig, code: string) => Promise<AuthTokens>;
  createGmailClient?: typeof createGmailClient;
  createAiProvider?: typeof createAiProvider;
  createSummaryStore?: typeof createSummaryStore;
  listInboxEmails?: typeof listInboxEmails;
  getEmailDetail?: typeof getEmailDetail;
  navigationInputs?: string[];
  runInkSession?: (options: RunInkSessionOptions) => Promise<void>;
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
    '  --interactive           Keep session open for detail navigation',
    '  --commands <items>      Comma list of commands for scripted navigation',
    '  --print-auth-url        Print auth URL and exit',
    '  --help                  Show help'
  ];
}

function inferDetailPaneWidth(): number {
  const columns = process.stdout.columns;
  if (!columns || columns <= 0) {
    return 80;
  }

  return columns;
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
  const fetchEmailDetail = deps.getEmailDetail ?? getEmailDetail;
  const launchInkSession = deps.runInkSession ?? runInkSession;
  const createClient = deps.createGmailClient ?? createGmailClient;
  const createProvider = deps.createAiProvider ?? createAiProvider;
  const buildSummaryStore = deps.createSummaryStore ?? createSummaryStore;

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
  }) as GmailReadClientLike & GmailDetailClientLike & GmailMutationClientLike;

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
  const messageIds = visible.map((email) => email.message_id);
  const aiProvider = config.aiConfig ? createProvider(config.aiConfig) : null;
  const summaryService =
    config.aiConfig && aiProvider && isSummaryProvider(aiProvider)
      ? createEmailSummaryService({
          provider: aiProvider,
          providerName: config.aiConfig.provider,
          model: config.aiConfig.model,
          store: buildSummaryStore()
        })
      : undefined;

  writeLine(`Loaded ${emails.length} emails, showing ${visible.length}.`);
  if (options.interactive) {
    await launchInkSession({
      listLines: lines,
      messageIds,
      fetchDetailLines: async (messageId) => {
        const detail = await fetchEmailDetail(gmail, messageId, { userId: 'me' });
        return renderEmailPreview(detail, inferDetailPaneWidth());
      },
      archiveEmail: async (messageId) => {
        await archiveGmailEmail(gmail, messageId, { userId: 'me' });
      },
      deleteEmail: async (messageId) => {
        await deleteGmailEmail(gmail, messageId, { userId: 'me' });
      },
      emails: visible,
      provider: aiProvider,
      summaryService,
      scriptedCommands: deps.navigationInputs ?? options.commands,
      writeFrame: (frame) => {
        for (const line of frame) {
          writeLine(line);
        }
      }
    });
  } else {
    for (const line of lines) {
      writeLine(line);
    }
  }

  return 0;
}
