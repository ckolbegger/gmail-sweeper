import { describe, expect, it } from 'vitest';
import { parseAuthorizationCode } from '../../../src/cli/parse-auth-code.js';

describe('parseAuthorizationCode', () => {
  it('returns plain authorization code as-is', () => {
    expect(parseAuthorizationCode('4/0ASc3gABC123')).toBe('4/0ASc3gABC123');
  });

  it('extracts code from callback URL', () => {
    const input =
      'http://localhost/?code=4%2F0ASc3gXYZ&scope=https://www.googleapis.com/auth/gmail.readonly';

    expect(parseAuthorizationCode(input)).toBe('4/0ASc3gXYZ');
  });

  it('extracts code from query fragment pasted after code', () => {
    const input =
      '4/0ASc3gC3z6dqwBdvZD9Jjoyl5GsyJNkNZHOsHg8mFdZnZjXW5LTP3z6bs5JdI4XzfYhf-0g&scope=https://www.googleapis.com/auth/gmail.readonly';

    expect(parseAuthorizationCode(input)).toBe(
      '4/0ASc3gC3z6dqwBdvZD9Jjoyl5GsyJNkNZHOsHg8mFdZnZjXW5LTP3z6bs5JdI4XzfYhf-0g'
    );
  });

  it('extracts code when pasted as code=... without URL prefix', () => {
    const input =
      'code=4/0ASc3gC3zHaCcFBUbb4fWwOnXeg5V0q5glFlTt60WT2h_9YMlytLStr5xB9vB5q6IWH4n5Q&scope=https://www.googleapis.com/auth/gmail.readonly';

    expect(parseAuthorizationCode(input)).toBe(
      '4/0ASc3gC3zHaCcFBUbb4fWwOnXeg5V0q5glFlTt60WT2h_9YMlytLStr5xB9vB5q6IWH4n5Q'
    );
  });
});
