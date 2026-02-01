/**
 * T034-T036: Unit tests for CLI entry point.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, validateAccount, type CLIOptions } from '../../../src/cli/index.js';

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
});
