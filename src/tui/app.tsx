/**
 * T041/T048/T050/T025: Main TUI app shell - coordinates email list, preview, keyboard navigation, and smart filter.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { GmailClient } from '../core/gmail/client.js';
import type { EmailCache } from '../core/cache/db.js';
import { EmailList } from './components/EmailList.js';
import { EmailPreview } from './components/EmailPreview.js';
import type { DetailViewMode } from './components/EmailPreview.js';
import { FilterInput } from './components/FilterInput.js';
import { useGmail } from './hooks/useGmail.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useSmartFilter } from './hooks/useSmartFilter.js';
import { useEmailActions } from './hooks/useEmailActions.js';
import { useEmailSummary } from './hooks/useEmailSummary.js';
import { resolveAiConfig } from '../core/ai/config.js';

interface AppProps {
  client: GmailClient;
  cache: EmailCache;
  maxEmails?: number;
  maxContextTokens?: number;
}

export function InboxApp({ client, cache, maxEmails, maxContextTokens: _maxContextTokens }: AppProps) {
  const { emails, isLoading, error, fetchEmailDetail, refresh, loadMore, removeEmail, restoreEmail } = useGmail({
    client,
    cache,
    ...(maxEmails !== undefined ? { initialLoadSize: maxEmails } : {}),
  });
  const smartFilter = useSmartFilter({ emails });
  const lastFetchedId = useRef<string | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('full');
  const aiConfig = useMemo(() => resolveAiConfig(), []);
  const { summaryState, requestSummary: requestEmailSummary, reset: resetEmailSummary } = useEmailSummary({ cache, aiConfig });
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;
  // Reserve 4 lines for header + footer + filter input + loading indicator
  const contentHeight = Math.max(5, terminalHeight - 4);

  const isFilterInputActive = smartFilter.status === 'input' || smartFilter.status === 'loading';
  const isFilterActive = smartFilter.status === 'filtered';

  // Choose which emails to display
  const displayEmails = isFilterActive ? smartFilter.filteredEmails : emails;

  const actions = useEmailActions({
    client,
    emails: displayEmails,
    onRemove: removeEmail,
    onRestore: restoreEmail,
    onPersistRemove: (id) => cache.removeEmail(id),
  });

  // Use ref to break circular dependency: selectedEmail depends on keyboard.selectedIndex,
  // but useKeyboard needs onArchive/onDelete which depend on selectedEmail.
  const selectedEmailRef = useRef<typeof displayEmails[number] | undefined>();

  const handleToggleSummary = useCallback(() => {
    if (detailViewMode === 'full') {
      setDetailViewMode('summary');
      const email = selectedEmailRef.current;
      if (email) requestEmailSummary(email);
    } else {
      setDetailViewMode('full');
    }
  }, [detailViewMode, requestEmailSummary]);

  const keyboard = useKeyboard({
    itemCount: displayEmails.length,
    selectedIndex: 0,
    onSelect: () => {},
    onRefresh: refresh,
    onLoadMore: loadMore,
    pageSize: 10,
    onActivateFilter: smartFilter.activateFilter,
    onClearFilter: smartFilter.clearFilter,
    isFilterInputActive,
    onArchive: () => { if (selectedEmailRef.current) actions.archive(selectedEmailRef.current.id); },
    onDelete: () => { if (selectedEmailRef.current) actions.delete(selectedEmailRef.current.id); },
    onToggleSummary: handleToggleSummary,
  });

  // Derive selected email from current navigation index
  const selectedEmail = displayEmails[keyboard.selectedIndex];
  selectedEmailRef.current = selectedEmail;

  // Fetch full email body when selection changes
  useEffect(() => {
    if (selectedEmail && selectedEmail.id !== lastFetchedId.current) {
      if (!selectedEmail.bodyText && !selectedEmail.bodyHtml) {
        lastFetchedId.current = selectedEmail.id;
        fetchEmailDetail(selectedEmail.id);
      }
    }
  }, [selectedEmail, fetchEmailDetail]);

  // Reset summary state when selected email changes (T008)
  useEffect(() => {
    setDetailViewMode('full');
    resetEmailSummary();
  }, [selectedEmail?.id, resetEmailSummary]);

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

  // T048/T025: Split-pane layout with smart filter integration
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>📧 Gmail Inbox</Text>
        <Text dimColor> ({emails.length} emails)</Text>
        {isFilterActive && (
          <Text color="cyan"> | Filter: &quot;{smartFilter.filterDescription}&quot;</Text>
        )}
      </Box>

      {/* Filter input/status (FR-001, FR-004) */}
      {(smartFilter.status === 'input' || smartFilter.status === 'loading' || smartFilter.status === 'error') && (
        <Box marginBottom={1}>
          <FilterInput
            isLoading={smartFilter.status === 'loading'}
            error={smartFilter.status === 'error' ? smartFilter.error : null}
            filterDescription={smartFilter.filterDescription}
            progress={smartFilter.progress}
            onSubmit={smartFilter.submitFilter}
            onCancel={smartFilter.clearFilter}
          />
        </Box>
      )}

      {/* Main content - split pane */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left: Email list */}
        <Box width="50%" height={contentHeight} overflow="hidden">
          <EmailList
            emails={displayEmails}
            selectedIndex={keyboard.selectedIndex}
            maxSubjectLength={40}
            viewportHeight={contentHeight}
            {...(isFilterActive ? { filterCount: smartFilter.filteredEmails.length, totalCount: emails.length } : {})}
          />
        </Box>

        {/* Right: Email preview */}
        <Box width="50%" paddingLeft={1} height={contentHeight} overflow="hidden">
          <EmailPreview
            email={selectedEmail}
            maxHeight={contentHeight}
            scrollOffset={keyboard.previewScrollOffset}
            viewMode={detailViewMode}
            summaryState={summaryState}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          j/k or ↑↓ to navigate • e archive • # delete • s summary • q to quit • Ctrl+R refresh • Ctrl+N load more • f filter{isFilterActive || isFilterInputActive ? ' • Esc clear' : ''}
        </Text>
      </Box>

      {/* Action error display */}
      {actions.actionError && (
        <Box>
          <Text color="red">⚠ {actions.actionError}</Text>
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && emails.length > 0 && (
        <Box marginTop={1}>
          <Text>⏳ Loading more emails...</Text>
        </Box>
      )}
    </Box>
  );
}
