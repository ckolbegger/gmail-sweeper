/**
 * T041/T048/T050: Main TUI app shell - coordinates email list, preview, and keyboard navigation.
 */

import React, { useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
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

interface RawKeyboardEvent {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
}

export function InboxApp({ client, cache }: AppProps) {
  const { emails, isLoading, error, refresh } = useGmail({ client, cache });
  const [selectedEmail, setSelectedEmail] = React.useState<Email | undefined>();

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

  // Handle keyboard input
  const handleInput = useCallback(
    (input: string, key: RawKeyboardEvent | { name: string; ctrl?: boolean; shift?: boolean }) => {
      const keyEvent = 'key' in key ? key : { key: key.name, ctrlKey: key.ctrl, shiftKey: key.shift };
      keyboard.handleKey(keyEvent);

      // Update selected email when keyboard navigation changes
      if (emails[keyboard.selectedIndex]) {
        setSelectedEmail(emails[keyboard.selectedIndex]);
      }

      // Handle refresh
      if (keyEvent.key === 'r' && keyEvent.ctrlKey) {
        refresh();
      }

      // Handle quit
      if (keyEvent.key === 'q' || (keyEvent.key === 'c' && keyEvent.ctrlKey)) {
        process.exit(0);
      }
    },
    [keyboard, emails, refresh]
  );

  // T050: Loading state with spinner
  if (isLoading && emails.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Spinner type="dots" />
          <Text> Loading emails...</Text>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Error: {error.message}</Text>
        <Text dimColor>Press Ctrl+R to retry, q to quit</Text>
      </Box>
    );
  }

  // T048: Split-pane layout (list + preview side by side)
  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box flexDirection="row" borderBottomStyle="single" borderColor="gray" marginBottom={1}>
        <Box flexGrow={1}>
          <Text bold>📧 Gmail Inbox</Text>
        </Box>
        <Box>
          <Text dimColor>
            {emails.length} emails • j/k or ↑↓ to navigate • Enter to preview • q to quit
          </Text>
        </Box>
      </Box>

      {/* Main content - split pane */}
      <Box flexDirection="row" width="100%" flexGrow={1}>
        {/* Left: Email list (40% width) */}
        <Box flexBasis="40%">
          <EmailList
            emails={emails}
            selectedIndex={keyboard.selectedIndex}
            onSelect={(index) => {
              if (emails[index]) {
                setSelectedEmail(emails[index]);
              }
            }}
            maxSubjectLength={45}
            viewportHeight={20}
          />
        </Box>

        {/* Divider */}
        <Box flexBasis="1%">
          <Box borderRightStyle="single" borderColor="gray">
            <Text> </Text>
          </Box>
        </Box>

        {/* Right: Email preview (59% width) */}
        <Box flexBasis="59%" flexDirection="column" paddingLeft={1}>
          <EmailPreview email={selectedEmail} maxHeight={20} />
        </Box>
      </Box>

      {/* Footer with loading indicator */}
      {isLoading && emails.length > 0 && (
        <Box marginTop={1} borderTopStyle="single" borderColor="gray">
          <Spinner type="dots" />
          <Text> Loading more emails...</Text>
        </Box>
      )}
    </Box>
  );
}
