/**
 * T041/T048/T050: Main TUI app shell - coordinates email list, preview, and keyboard navigation.
 */

import { useEffect, useRef } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { GmailClient } from '../core/gmail/client.js';
import type { EmailCache } from '../core/cache/db.js';
import { EmailList } from './components/EmailList.js';
import { EmailPreview } from './components/EmailPreview.js';
import { useGmail } from './hooks/useGmail.js';
import { useKeyboard } from './hooks/useKeyboard.js';

interface AppProps {
  client: GmailClient;
  cache: EmailCache;
}

export function InboxApp({ client, cache }: AppProps) {
  const { emails, isLoading, error, fetchEmailDetail, refresh } = useGmail({ client, cache });
  const lastFetchedId = useRef<string | null>(null);
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;
  // Reserve 3 lines for header + footer + loading indicator
  const contentHeight = Math.max(5, terminalHeight - 3);

  const keyboard = useKeyboard({
    itemCount: emails.length,
    selectedIndex: 0,
    onSelect: () => {},
    onRefresh: refresh,
    pageSize: 10,
  });

  // Derive selected email from current navigation index
  const selectedEmail = emails[keyboard.selectedIndex];

  // Fetch full email body when selection changes
  useEffect(() => {
    if (selectedEmail && selectedEmail.id !== lastFetchedId.current) {
      if (!selectedEmail.bodyText && !selectedEmail.bodyHtml) {
        lastFetchedId.current = selectedEmail.id;
        fetchEmailDetail(selectedEmail.id);
      }
    }
  }, [selectedEmail, fetchEmailDetail]);

  // T050: Loading state
  if (isLoading && emails.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>⏳ Loading emails...</Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Error: {error.message}</Text>
        <Text dimColor>Ctrl+C to exit</Text>
      </Box>
    );
  }

  // T048: Split-pane layout (list + preview side by side)
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>📧 Gmail Inbox</Text>
        <Text dimColor> ({emails.length} emails)</Text>
      </Box>

      {/* Main content - split pane */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left: Email list */}
        <Box width="50%" height={contentHeight} overflow="hidden">
          <EmailList
            emails={emails}
            selectedIndex={keyboard.selectedIndex}
            maxSubjectLength={40}
            viewportHeight={contentHeight}
          />
        </Box>

        {/* Right: Email preview */}
        <Box width="50%" paddingLeft={1} height={contentHeight} overflow="hidden">
          <EmailPreview email={selectedEmail} maxHeight={contentHeight} scrollOffset={keyboard.previewScrollOffset} />
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>j/k or ↑↓ to navigate • Enter to preview • q to quit • Ctrl+R to refresh</Text>
      </Box>

      {/* Loading indicator */}
      {isLoading && emails.length > 0 && (
        <Box marginTop={1}>
          <Text>⏳ Loading more emails...</Text>
        </Box>
      )}
    </Box>
  );
}
