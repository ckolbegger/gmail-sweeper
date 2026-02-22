/**
 * T049: TUI entry point - initializes and renders the Ink app.
 */

import { render } from 'ink';
import type { GmailClient } from '../core/gmail/client.js';
import type { EmailCache } from '../core/cache/db.js';
import { InboxApp } from './app.js';

export interface LaunchTUIOptions {
  client: GmailClient;
  cache: EmailCache;
  maxEmails?: number;
  maxContextTokens?: number;
}

/**
 * Launches the TUI application.
 */
export async function launchTUI(options: LaunchTUIOptions): Promise<void> {
  const { client, cache, maxEmails, maxContextTokens } = options;

  // Initialize cache
  await cache.initialize();

  // Render Ink app
  const { waitUntilExit } = render(
    <InboxApp client={client} cache={cache} {...(maxEmails !== undefined ? { maxEmails } : {})} {...(maxContextTokens !== undefined ? { maxContextTokens } : {})} />
  );

  // Wait for app to exit
  await waitUntilExit();
}
