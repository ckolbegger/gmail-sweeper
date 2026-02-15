import { describe, expect, it } from 'vitest';

import { parseCliArgs } from '@/cli/args.js';

describe('CLI argument parser', () => {
  it('should parse sender/date/label/category filters from flags', () => {
    const options = parseCliArgs([
      '--sender',
      'lead@work.com',
      '--label',
      'WORK',
      '--category',
      'updates',
      '--date-from',
      '2026-01-20',
      '--date-to',
      '2026-01-25'
    ]);

    expect(options.sender).toBe('lead@work.com');
    expect(options.label).toBe('WORK');
    expect(options.category).toBe('updates');
    expect(options.dateFrom).toBe(Date.parse('2026-01-20'));
    expect(options.dateTo).toBe(Date.parse('2026-01-25'));
  });

  it('should parse pagination and output limit flags with defaults', () => {
    const defaults = parseCliArgs([]);
    expect(defaults.pageLimit).toBe(5);
    expect(defaults.pageSize).toBe(50);
    expect(defaults.limit).toBe(25);
    expect(defaults.tokenPath).toBe('.gmail-sweeper/tokens.json');

    const custom = parseCliArgs(['--page-limit', '2', '--page-size', '10', '--limit', '3']);
    expect(custom.pageLimit).toBe(2);
    expect(custom.pageSize).toBe(10);
    expect(custom.limit).toBe(3);
  });

  it('should parse interactive navigation flags', () => {
    const options = parseCliArgs([
      '--interactive',
      '--commands',
      'down,enter,back,quit'
    ]);

    expect(options.interactive).toBe(true);
    expect(options.commands).toEqual(['down', 'enter', 'back', 'quit']);
  });

  it('should reject unknown flags with clear errors', () => {
    expect(() => parseCliArgs(['--unknown'])).toThrow('Unknown argument: --unknown');
  });
});
