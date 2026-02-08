#!/usr/bin/env node

/**
 * T034-T036: CLI entry point for Gmail Sweep.
 */

import { Command } from 'commander';
import { loadConfig, createDefaultConfig, DEFAULT_CONFIG_DIR } from '../core/config.js';
import type { Config } from '../core/models/index.js';

/** CLI version from package.json */
const VERSION = '0.1.0';

/**
 * CLI options parsed from command line arguments.
 */
export interface CLIOptions {
  /** Gmail account email address */
  account?: string;
  /** Configuration directory path */
  configDir?: string;
  /** Whether to require confirmation for destructive actions */
  confirm?: boolean;
  /** Debug mode */
  debug?: boolean;
}

/**
 * T034: Parses command line arguments.
 * @param argv - Command line arguments (defaults to process.argv)
 * @returns Parsed CLI options
 */
export function parseArgs(argv: string[] = process.argv.slice(2)): CLIOptions {
  const program = new Command()
    .name('gmail-sweep')
    .description('Smart Inbox Organizer - Gmail organization tool with natural language search')
    .version(VERSION, '-v, --version', 'Display version number')
    .option('-a, --account <email>', 'Gmail account email address')
    .option('-c, --config-dir <path>', 'Configuration directory path', DEFAULT_CONFIG_DIR)
    .option('--no-confirm', 'Skip confirmation prompts for destructive actions')
    .option('-d, --debug', 'Enable debug output')
    .helpOption('-h, --help', 'Display help information')
    .allowUnknownOption(false)
    .exitOverride();

  try {
    program.parse(argv, { from: 'user' });
  } catch (error) {
    const exitError = error as { exitCode?: number };
    if (exitError.exitCode === 0) {
      // Help or version was displayed
      throw error;
    }
    throw error;
  }

  const opts = program.opts<{
    account?: string;
    configDir?: string;
    confirm?: boolean;
    debug?: boolean;
  }>();

  const result: CLIOptions = {};
  if (opts.account !== undefined) {
    result.account = opts.account;
  }
  if (opts.configDir !== undefined) {
    result.configDir = opts.configDir;
  }
  if (opts.confirm !== undefined) {
    result.confirm = opts.confirm;
  }
  if (opts.debug !== undefined) {
    result.debug = opts.debug;
  }
  return result;
}

/**
 * T035: Validates and resolves the Gmail account to use.
 * @param options - CLI options
 * @param defaultAccount - Default account from config
 * @param knownAccounts - List of known/configured accounts (optional)
 * @returns Resolved account email
 * @throws Error if account validation fails
 */
export function validateAccount(
  options: CLIOptions,
  defaultAccount: string,
  knownAccounts?: string[]
): string {
  const account = options.account ?? defaultAccount;

  // If we have a list of known accounts and an account is specified, validate it
  if (knownAccounts && knownAccounts.length > 0 && account) {
    if (!knownAccounts.includes(account)) {
      throw new Error(
        `Account not found in configuration: ${account}\n` +
          `Known accounts: ${knownAccounts.join(', ')}`
      );
    }
  }

  return account;
}

/**
 * T036: Main entry point - launches the TUI application.
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();

    const configDir = options.configDir ?? DEFAULT_CONFIG_DIR;

    // Ensure config exists
    await createDefaultConfig(configDir);

    // Load configuration
    const config = await loadConfig(configDir);

    // Resolve account
    const account = validateAccount(options, config.gmailAccount);

    if (!account) {
      console.error(
        'No Gmail account specified. Use --account <email> or set gmailAccount in config.'
      );
      process.exit(1);
    }

    // Apply CLI overrides to config
    const effectiveConfig: Config = {
      ...config,
      gmailAccount: account,
      confirmDestructive: options.confirm ?? config.confirmDestructive,
    };

    if (options.debug) {
      console.error('Debug mode enabled');
      console.error('Config directory:', configDir);
      console.error('Account:', account);
      console.error('Config:', JSON.stringify(effectiveConfig, null, 2));
    }

    // Launch TUI - T036
    const { GmailClient } = await import('../core/gmail/client.js');
    const { EmailCache } = await import('../core/cache/db.js');
    const { launchTUI } = await import('../tui/index.js');

    // Initialize Gmail client
    const client = new GmailClient(account, configDir);
    await client.authenticate();

    // Initialize email cache
    const dbPath = `${configDir}/emails.db`;
    const cache = new EmailCache(dbPath);

    // Launch TUI application
    await launchTUI(client, cache);
  } catch (error) {
    if (error instanceof Error) {
      // Commander.js help/version exits
      if (error.message === 'process.exit called') {
        return;
      }
      console.error('Error:', error.message);
    } else {
      console.error('An unexpected error occurred');
    }
    process.exit(1);
  }
}

// Run if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}
