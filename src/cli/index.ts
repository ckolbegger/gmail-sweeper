#!/usr/bin/env node

/**
 * CLI Entry Point
 *
 * Main entry point for the Gmail Sweep CLI application.
 * Supports subcommands: auth, sync, or default TUI launch.
 */

import { renderApp } from './app.js';
import { loadEnvFile } from '../core/config/env.js';
import { parseAuthorizationCode } from './parse-auth-code.js';

export { renderApp };

loadEnvFile();

function printUsage(): void {
  console.log(`Usage: gmail-sweep [command]

Commands:
  (none)    Launch the TUI inbox browser
  auth      Authenticate with Gmail via OAuth2
  sync      Sync emails from Gmail to local database

Options:
  --help    Show this help message

Environment variables:
  GMAIL_CLIENT_ID       OAuth2 client ID
  GMAIL_CLIENT_SECRET   OAuth2 client secret
  GMAIL_REDIRECT_URI    OAuth2 redirect URI
  DATABASE_PATH         Custom database file path
  DETAIL_BODY_MARGIN    Right pane body margin (4-20, default: 10)`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  switch (command) {
    case 'auth': {
      const { AuthManager } = await import('../core/services/auth-manager.js');
      const { createInterface } = await import('node:readline');

      const clientId = process.env.GMAIL_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET;
      const redirectUri = process.env.GMAIL_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        console.error(
          'Error: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI must be set.'
        );
        process.exit(1);
      }

      const authManager = new AuthManager({ clientId, clientSecret, redirectUri });

      const alreadyAuthed = await authManager.isAuthenticated();
      if (alreadyAuthed) {
        console.log('Already authenticated!');
        break;
      }

      const authUrl = await authManager.getAuthUrl();
      console.log('Open this URL in your browser to authenticate:\n');
      console.log(authUrl);
      console.log();

      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const code = await new Promise<string>((resolve) => {
        rl.question('Paste the authorization code here: ', (answer) => {
          rl.close();
          resolve(parseAuthorizationCode(answer));
        });
      });

      await authManager.exchangeCode(code);
      console.log('Authentication successful!');
      break;
    }

    case 'sync': {
      const { GmailClient } = await import('../core/services/gmail-client.js');
      const { getDatabase } = await import('../core/persistence/database.js');
      const { EmailRepository } = await import('../core/services/email-repository.js');
      const { homedir } = await import('node:os');
      const { join, dirname } = await import('node:path');
      const { mkdirSync } = await import('node:fs');

      const clientId = process.env.GMAIL_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET;
      const redirectUri = process.env.GMAIL_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        console.error(
          'Error: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI must be set.'
        );
        process.exit(1);
      }

      const dbPath =
        process.env.DATABASE_PATH ?? join(homedir(), '.local', 'share', 'gmail-sweep', 'emails.db');
      mkdirSync(dirname(dbPath), { recursive: true });

      const db = getDatabase({ path: dbPath });
      const emailRepository = new EmailRepository(db);
      const gmailClient = new GmailClient({ clientId, clientSecret, redirectUri });

      const isAuthenticated = await gmailClient.auth.isAuthenticated();
      if (!isAuthenticated) {
        console.error('Error: Not authenticated. Run `gmail-sweep auth` first.');
        process.exit(1);
      }

      const incremental = args.includes('--incremental');
      console.log(`Starting ${incremental ? 'incremental' : 'full'} sync...`);

      const result = await gmailClient.listEmails({ page: 1, pageSize: 500 });
      console.log(`Fetched ${result.items.length} emails from Gmail`);

      for (const email of result.items) {
        await emailRepository.save(email);
      }

      console.log('Sync complete!');
      break;
    }

    case undefined:
      renderApp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

void main();
