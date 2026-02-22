#!/usr/bin/env node
/**
 * Gmail Sweep CLI Entry Point
 *
 * Command-line interface for Gmail Sweep.
 */

// Load environment variables from .env file if present
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Try to load .env from current working directory or project root
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(import.meta.dirname || __dirname, '../../.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}

import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { createAuthManager } from '../core/services/auth-manager.js';
import { createGmailClient } from '../core/services/gmail-client.js';
import { EmailRepository } from '../core/services/email-repository.js';
import { getDefaultDatabase } from '../core/persistence/database.js';
import { logger } from '../core/logging/index.js';

// ============================================================================
// Configuration
// ============================================================================

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

// ============================================================================
// Commands
// ============================================================================

async function authCommand(): Promise<void> {
  console.log('🔐 Gmail Sweep Authentication\n');

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in environment');
    console.error('\nPlease set these environment variables:');
    console.error('  export GMAIL_CLIENT_ID=your_client_id');
    console.error('  export GMAIL_CLIENT_SECRET=your_client_secret');
    process.exit(1);
  }

  const authManager = createAuthManager({
    clientId: GMAIL_CLIENT_ID,
    clientSecret: GMAIL_CLIENT_SECRET,
    redirectUri: GMAIL_REDIRECT_URI,
  });

  try {
    // Check if already authenticated
    const isAuthenticated = await authManager.isAuthenticated();
    if (isAuthenticated) {
      console.log('✅ Already authenticated!');
      console.log('Run "gmail-sweep" to launch the TUI.\n');
      return;
    }

    // Generate auth URL
    const authUrl = await authManager.getAuthUrl();

    console.log('1. Open this URL in your browser:');
    console.log(`   ${authUrl}\n`);
    console.log('2. Sign in with your Google account and authorize the app');
    console.log('3. You will be redirected to localhost (ignore the "site can\'t be reached" error)');
    console.log('4. Copy the authorization code from the URL\n');
    console.log('Waiting for authorization code...\n');

    // Read authorization code from stdin
    process.stdout.write('Enter authorization code: ');

    const code = await new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });

    console.log('\nAuthenticating...\n');

    // Exchange code for tokens
    const credentials = await authManager.exchangeCode(code);

    console.log('✅ Authentication successful!');
    console.log(`   Access token: ${credentials.accessToken.slice(0, 10)}...`);
    if (credentials.refreshToken) {
      console.log('   Refresh token: obtained');
    }
    console.log('\nRun "gmail-sweep" to launch the TUI.\n');
  } catch (error) {
    console.error('\n❌ Authentication failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function syncCommand(options: { full?: boolean; since?: string } = {}): Promise<void> {
  console.log('🔄 Gmail Sweep Sync\n');

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set');
    process.exit(1);
  }

  const authManager = createAuthManager({
    clientId: GMAIL_CLIENT_ID,
    clientSecret: GMAIL_CLIENT_SECRET,
    redirectUri: GMAIL_REDIRECT_URI,
  });

  const isAuthenticated = await authManager.isAuthenticated();
  if (!isAuthenticated) {
    console.error('❌ Not authenticated. Run: gmail-sweep auth');
    process.exit(1);
  }

  const gmailClient = createGmailClient(authManager);
  const db = getDefaultDatabase();
  await db.initialize();
  const emailRepository = new EmailRepository(db);

  // Parse since date
  let sinceDate: Date | undefined;
  if (options.since) {
    // Try to parse as relative time (e.g., "7d", "30d", "1w", "1m")
    const relativeMatch = options.since.match(/^(\d+)([dwm])$/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2].toLowerCase();
      sinceDate = new Date();
      switch (unit) {
        case 'd':
          sinceDate.setDate(sinceDate.getDate() - amount);
          break;
        case 'w':
          sinceDate.setDate(sinceDate.getDate() - amount * 7);
          break;
        case 'm':
          sinceDate.setMonth(sinceDate.getMonth() - amount);
          break;
      }
    } else {
      // Try to parse as ISO date
      sinceDate = new Date(options.since);
      if (isNaN(sinceDate.getTime())) {
        console.error('❌ Invalid --since date format. Use ISO date (2024-01-01) or relative (7d, 1w, 1m)');
        process.exit(1);
      }
    }
  }

  try {
    // Get count estimate first
    let query: string | undefined;
    if (sinceDate) {
      const afterDate = Math.floor(sinceDate.getTime() / 1000);
      query = `after:${afterDate}`;
    }
    
    console.log('📊 Getting email count estimate...');
    const estimatedCount = await gmailClient.getEmailCountEstimate(query);
    console.log(`   Estimated emails to sync: ${estimatedCount.toLocaleString()}\n`);

    if (sinceDate) {
      console.log(`⏰ Syncing emails since ${sinceDate.toISOString()}...\n`);
    } else {
      console.log(options.full ? 'Performing full sync...\n' : 'Performing incremental sync...\n');
    }

    const startTime = Date.now();
    const result = await gmailClient.fullSync({
      batchSize: 100,
      since: sinceDate,
      onProgress: (progress) => {
        process.stdout.write(`\r📧 Synced ${progress.processedCount}/${progress.totalCount} emails...`);
      },
    });

    // Save to database
    console.log('\n\nSaving to local database...');
    for (const email of result.emails) {
      await emailRepository.save(email);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Sync complete!`);
    console.log(`   Emails synced: ${result.emails.length}`);
    console.log(`   History ID: ${result.historyId}`);
    console.log(`   Duration: ${duration}s\n`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function mainCommand(): Promise<void> {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set');
    console.error('\nPlease set these environment variables:');
    console.error('  export GMAIL_CLIENT_ID=your_client_id');
    console.error('  export GMAIL_CLIENT_SECRET=your_client_secret');
    process.exit(1);
  }

  const authManager = createAuthManager({
    clientId: GMAIL_CLIENT_ID,
    clientSecret: GMAIL_CLIENT_SECRET,
    redirectUri: GMAIL_REDIRECT_URI,
  });

  const isAuthenticated = await authManager.isAuthenticated();
  if (!isAuthenticated) {
    console.error('❌ Not authenticated. Run: gmail-sweep auth');
    process.exit(1);
  }

  // Initialize database
  const db = getDefaultDatabase();
  await db.initialize();

  // Create services
  const gmailClient = createGmailClient(authManager);
  const emailRepository = new EmailRepository(db);

  // Launch TUI
  logger.info('Starting Gmail Sweep TUI');
  render(React.createElement(App, { gmailClient, emailRepository }));
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'auth':
      await authCommand();
      break;

    case 'sync':
      const full = args.includes('--full') || args.includes('-f');
      const sinceIndex = args.findIndex(arg => arg === '--since' || arg === '-s');
      const since = sinceIndex >= 0 && sinceIndex < args.length - 1 ? args[sinceIndex + 1] : undefined;
      await syncCommand({ full, since });
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
Gmail Sweep - CLI TUI for Gmail inbox organization

Usage:
  gmail-sweep [command] [options]

Commands:
  auth              Authenticate with Gmail (one-time setup)
  sync              Sync emails with Gmail
    --full, -f      Perform full sync instead of incremental
    --since, -s     Sync only emails since date (e.g., --since 7d, --since 2024-01-01)
  help              Show this help message

Environment Variables:
  GMAIL_CLIENT_ID      Google OAuth2 client ID (required)
  GMAIL_CLIENT_SECRET  Google OAuth2 client secret (required)
  GMAIL_REDIRECT_URI   OAuth2 redirect URI (default: http://localhost:3000/oauth2callback)
  GMAIL_SWEEP_DB       Path to SQLite database (optional)

Examples:
  gmail-sweep auth                    # Authenticate
  gmail-sweep sync                    # Sync emails
  gmail-sweep sync --full             # Full resync
  gmail-sweep                         # Launch TUI

Keyboard Shortcuts (in TUI):
  ↑/↓     Navigate emails
  Enter   View email details
  r       Refresh/sync
  q       Quit
`);
      break;

    case undefined:
    default:
      if (command?.startsWith('-')) {
        console.error(`Unknown option: ${command}`);
        console.error('Run "gmail-sweep help" for usage information');
        process.exit(1);
      }
      await mainCommand();
      break;
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
