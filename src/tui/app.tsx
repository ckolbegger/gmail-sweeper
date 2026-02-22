/**
 * T041/T048/T050: Main TUI app shell - coordinates email list, preview, and keyboard navigation.
 */

import { useEffect, useRef } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { GmailClient } from '../core/gmail/client.js';
import type { EmailCache } from '../core/cache/db.js';
import { EmailList } from './components/EmailList.js';
import { EmailPreview } from './components/EmailPreview.js';
import { FilterInput } from './components/FilterInput.js';
import { useGmail } from './hooks/useGmail.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useSmartFilter } from './hooks/useSmartFilter.js';

interface AppProps {
  client: GmailClient;
  cache: EmailCache;
}

export function InboxApp({ client, cache }: AppProps) {
  const { emails, isLoading, error, fetchEmailDetail, refresh } = useGmail({ client, cache });
  const lastFetchedId = useRef<string | null>(null);
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;

  const {
    filterState,
    filterDescription,
    filteredEmails,
    filterError,
    progress,
    activateFilter,
    submitFilter,
    clearFilter,
  } = useSmartFilter();

  const contentHeight = Math.max(5, terminalHeight - 3);

  const displayEmails = filterState === 'filtered' ? filteredEmails : emails;

  const keyboard = useKeyboard({
    itemCount: displayEmails.length,
    selectedIndex: 0,
    onSelect: () => {},
    onRefresh: refresh,
    pageSize: 10,
    filterState,
    onActivateFilter: activateFilter,
    onClearFilter: clearFilter,
  });

  const selectedEmail = displayEmails[keyboard.selectedIndex];

  useEffect(() => {
    if (selectedEmail && selectedEmail.id !== lastFetchedId.current) {
      if (!selectedEmail.bodyText && !selectedEmail.bodyHtml) {
        lastFetchedId.current = selectedEmail.id;
        fetchEmailDetail(selectedEmail.id);
      }
    }
  }, [selectedEmail, fetchEmailDetail]);

  if (isLoading && emails.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>⏳ Loading emails...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Error: {error.message}</Text>
        <Text dimColor>Ctrl+C to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>📧 Gmail Inbox</Text>
        <Text dimColor> ({emails.length} emails)</Text>
        {filterState === 'filtered' && <Text dimColor> | Filter: "{filterDescription}"</Text>}
      </Box>

      {/* Main content - split pane */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left: Email list */}
        <Box width="50%" height={contentHeight} overflow="hidden">
          <EmailList
            emails={displayEmails}
            selectedIndex={keyboard.selectedIndex}
            maxSubjectLength={40}
            viewportHeight={contentHeight}
            {...(filterState === 'filtered'
              ? { filterCount: filteredEmails.length, totalCount: emails.length }
              : {})}
          />
        </Box>

        {/* Right: Email preview */}
        <Box width="50%" paddingLeft={1} height={contentHeight} overflow="hidden">
          <EmailPreview
            email={selectedEmail}
            maxHeight={contentHeight}
            scrollOffset={keyboard.previewScrollOffset}
          />
        </Box>
      </Box>

      {/* Filter Input - at the bottom, always visible */}
      {filterState !== 'idle' && filterState !== 'filtered' && (
        <Box marginTop={1}>
          <FilterInput
            state={filterState}
            errorMessage={filterError}
            onSubmit={(description) => submitFilter(description, emails)}
            onCancel={clearFilter}
            progress={progress}
          />
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          {filterState === 'input' || filterState === 'loading'
            ? 'Enter to filter • Escape to cancel'
            : 'j/k or ↑↓ to navigate • Enter to preview • f to filter • q to quit • Ctrl+R to refresh'}
        </Text>
        {filterState === 'filtered' && <Text dimColor> • Esc to clear filter</Text>}
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
