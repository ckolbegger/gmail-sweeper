/**
 * T049: TUI entry point - initializes and renders the Ink app.
 */

import { render } from 'ink';
import type { GmailClient } from '../core/gmail/client.js';
import type { EmailCache } from '../core/cache/db.js';
import { InboxApp } from './app.js';

/**
 * Launches the TUI application.
 * @param client - Authenticated Gmail client
 * @param cache - Email cache instance
 */
export async function launchTUI(client: GmailClient, cache: EmailCache): Promise<void> {
  // Initialize cache
  await cache.initialize();

  // Render Ink app
  const { waitUntilExit } = render(
    <InboxApp client={client} cache={cache} />
  );

  // Wait for app to exit
  await waitUntilExit();
}
