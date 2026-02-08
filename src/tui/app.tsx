/**
 * T041/T048/T050: Main TUI app shell - coordinates email list, preview, and keyboard navigation.
 */

import { useState } from 'react';
import { Box, Text } from 'ink';
import type { Email } from '../core/models/index.js';
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
  const { emails, isLoading, error } = useGmail({ client, cache });
  const [selectedEmail, setSelectedEmail] = useState<Email>();

  const keyboard = useKeyboard({
    itemCount: emails.length,
    selectedIndex: Math.max(
      0,
      selectedEmail ? emails.findIndex(e => e.id === selectedEmail.id) : 0
    ),
    onSelect: (index) => {
      if (emails[index]) {
        setSelectedEmail(emails[index]);
      }
    },
  });

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
      <Box flexDirection="row">
        {/* Left: Email list */}
        <Box width="50%">
          <EmailList
            emails={emails}
            selectedIndex={keyboard.selectedIndex}
            maxSubjectLength={40}
            viewportHeight={15}
          />
        </Box>

        {/* Right: Email preview */}
        <Box width="50%" paddingLeft={2}>
          <EmailPreview email={selectedEmail} maxHeight={15} />
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
