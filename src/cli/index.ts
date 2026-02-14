import { runInboxCli } from '@/cli/app.js';
import { mapError } from '@/core/errors.js';

async function main(): Promise<void> {
  const exitCode = await runInboxCli(process.argv.slice(2));
  process.exit(exitCode);
}

main().catch((error) => {
  const mapped = mapError(error);
  // eslint-disable-next-line no-console
  console.error(`(error) ${mapped.message}`);
  process.exit(1);
});
