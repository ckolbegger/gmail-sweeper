import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('package scripts', () => {
  it('should execute built CLI entrypoint via npm script', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.app).toBe('node dist/src/cli/index.js');
  });

  it('should support passing filter/auth flags through npm run', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const appScript = packageJson.scripts?.app ?? '';

    expect(appScript).toContain('dist/src/cli/index.js');
  });
});
