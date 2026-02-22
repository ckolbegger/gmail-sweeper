/**
 * T034-T036: Unit tests for CLI entry point.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, validateAccount, type CLIOptions } from '../../../src/cli/index.js';
import * as fs from 'fs';

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('T034: parseArgs', () => {
    it('should parse --account flag', () => {
      const args = parseArgs(['--account', 'user@gmail.com']);
      expect(args.account).toBe('user@gmail.com');
    });

    it('should parse -a shorthand for account', () => {
      const args = parseArgs(['-a', 'short@gmail.com']);
      expect(args.account).toBe('short@gmail.com');
    });

    it('should throw on --help', () => {
      expect(() => parseArgs(['--help'])).toThrow();
    });

    it('should throw on --version', () => {
      expect(() => parseArgs(['--version'])).toThrow();
    });

    it('should throw on unknown flag', () => {
      expect(() => parseArgs(['--unknown-flag'])).toThrow();
    });

    it('should parse --config-dir flag', () => {
      const args = parseArgs(['--config-dir', '/custom/path']);
      expect(args.configDir).toBe('/custom/path');
    });

    it('should parse --no-confirm flag', () => {
      const args = parseArgs(['--no-confirm']);
      expect(args.confirm).toBe(false);
    });

    it('should parse -d / --debug flag', () => {
      const args = parseArgs(['--debug']);
      expect(args.debug).toBe(true);
    });

    it('should parse combined flags', () => {
      const args = parseArgs(['-a', 'test@gmail.com', '-c', '/tmp/config', '--debug']);
      expect(args.account).toBe('test@gmail.com');
      expect(args.configDir).toBe('/tmp/config');
      expect(args.debug).toBe(true);
    });

    it('should parse --max-emails flag', () => {
      const args = parseArgs(['--max-emails', '100']);
      expect(args.maxEmails).toBe(100);
    });

    it('should parse -n shorthand for max-emails', () => {
      const args = parseArgs(['-n', '25']);
      expect(args.maxEmails).toBe(25);
    });

    it('should parse --max-context-tokens flag', () => {
      const args = parseArgs(['--max-context-tokens', '8000']);
      expect(args.maxContextTokens).toBe(8000);
    });

    it('should leave maxEmails undefined when not provided', () => {
      const args = parseArgs([]);
      expect(args.maxEmails).toBeUndefined();
    });

    it('should throw on non-numeric --max-emails', () => {
      expect(() => parseArgs(['--max-emails', 'abc'])).toThrow();
    });

    it('should throw on --max-emails 0', () => {
      expect(() => parseArgs(['--max-emails', '0'])).toThrow();
    });

    it('should throw on negative --max-emails', () => {
      expect(() => parseArgs(['--max-emails', '-1'])).toThrow();
    });

    it('should throw on non-numeric --max-context-tokens', () => {
      expect(() => parseArgs(['--max-context-tokens', 'abc'])).toThrow();
    });

    it('should throw on --max-context-tokens 0', () => {
      expect(() => parseArgs(['--max-context-tokens', '0'])).toThrow();
    });
  });

  describe('T035: validateAccount', () => {
    it('should use default account if not specified', () => {
      const options: CLIOptions = {};
      const defaultAccount = 'default@gmail.com';

      const account = validateAccount(options, defaultAccount);
      expect(account).toBe(defaultAccount);
    });

    it('should use provided account if specified', () => {
      const options: CLIOptions = { account: 'provided@gmail.com' };

      const account = validateAccount(options, 'default@gmail.com');
      expect(account).toBe('provided@gmail.com');
    });

    it('should throw on unknown account when validation is enabled', () => {
      const options: CLIOptions = { account: 'unknown@gmail.com' };
      const knownAccounts = ['known@gmail.com', 'also-known@gmail.com'];

      expect(() => validateAccount(options, '', knownAccounts)).toThrow(
        /Account not found in configuration/
      );
    });

    it('should accept account if in known accounts list', () => {
      const options: CLIOptions = { account: 'known@gmail.com' };
      const knownAccounts = ['known@gmail.com', 'also-known@gmail.com'];

      const account = validateAccount(options, '', knownAccounts);
      expect(account).toBe('known@gmail.com');
    });

    it('should return empty string if no account and no default', () => {
      const options: CLIOptions = {};
      const account = validateAccount(options, '');
      expect(account).toBe('');
    });
  });

  describe('dotenv', () => {
    it('should load environment variables from .env file', () => {
      // Create a temporary .env file for testing
      const testEnvPath = '/tmp/test-gmail-sweep.env';
      const testEnvContent = 'TEST_GMAIL_CLIENT_ID=test-client-id\nTEST_GMAIL_CLIENT_SECRET=test-secret\n';
      fs.writeFileSync(testEnvPath, testEnvContent);

      try {
        // Import and execute dotenv config
        const dotenv = require('dotenv');
        const result = dotenv.config({ path: testEnvPath });

        // Verify that dotenv.config succeeded
        expect(result.error).toBeUndefined();
        expect(result.parsed).toBeDefined();
        expect(result.parsed?.TEST_GMAIL_CLIENT_ID).toBe('test-client-id');
        expect(result.parsed?.TEST_GMAIL_CLIENT_SECRET).toBe('test-secret');
      } finally {
        // Cleanup
        fs.unlinkSync(testEnvPath);
      }
    });

    it('should verify .env file exists in project root', () => {
      // Check that the .env file exists in the project root
      const envPath = process.cwd() + '/.env';
      expect(fs.existsSync(envPath)).toBe(true);
    });

    it('should have GMAIL_CLIENT_ID in .env', () => {
      const envPath = process.cwd() + '/.env';
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('GMAIL_CLIENT_ID');
    });

    it('should have GMAIL_CLIENT_SECRET in .env', () => {
      const envPath = process.cwd() + '/.env';
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('GMAIL_CLIENT_SECRET');
    });

    it('should have GMAIL_REDIRECT_URI in .env', () => {
      const envPath = process.cwd() + '/.env';
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('GMAIL_REDIRECT_URI');
    });
  });
});
