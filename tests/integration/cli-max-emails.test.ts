/**
 * T026b-3: Integration test — CLI → TUI flow for --max-emails and --max-context-tokens.
 *
 * Verifies that CLI flags are parsed and would flow correctly into
 * the application config that controls email fetching and context sizing.
 */

import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli/index.js';

describe('CLI --max-emails integration', () => {
  it('parseArgs extracts maxEmails=10 from --max-emails 10', () => {
    const opts = parseArgs(['--account', 'test@gmail.com', '--max-emails', '10']);
    expect(opts.maxEmails).toBe(10);
  });

  it('parseArgs extracts maxEmails=25 from -n 25 shorthand', () => {
    const opts = parseArgs(['-a', 'test@gmail.com', '-n', '25']);
    expect(opts.maxEmails).toBe(25);
  });

  it('parseArgs extracts maxContextTokens from --max-context-tokens 1000', () => {
    const opts = parseArgs(['--account', 'test@gmail.com', '--max-context-tokens', '1000']);
    expect(opts.maxContextTokens).toBe(1000);
  });

  it('defaults maxEmails to undefined when flag not provided', () => {
    const opts = parseArgs(['--account', 'test@gmail.com']);
    expect(opts.maxEmails).toBeUndefined();
  });

  it('defaults maxContextTokens to undefined when flag not provided', () => {
    const opts = parseArgs(['--account', 'test@gmail.com']);
    expect(opts.maxContextTokens).toBeUndefined();
  });

  it('parses all three flags together for full CLI invocation', () => {
    const opts = parseArgs([
      '--account', 'test@gmail.com',
      '--max-emails', '10',
      '--max-context-tokens', '4000',
      '--debug',
    ]);
    expect(opts.account).toBe('test@gmail.com');
    expect(opts.maxEmails).toBe(10);
    expect(opts.maxContextTokens).toBe(4000);
    expect(opts.debug).toBe(true);
  });
});
