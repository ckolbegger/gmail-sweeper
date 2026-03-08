/**
 * T041/T048/T050: Main TUI app shell - coordinates email list, preview, and keyboard navigation.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { GmailClient } from '../core/gmail/client.js';
import type { EmailCache } from '../core/cache/db.js';
import { EmailList } from './components/EmailList.js';
import { EmailPreview } from './components/EmailPreview.js';
import { FilterInput } from './components/FilterInput.js';
import { useGmail } from './hooks/useGmail.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useSmartFilter } from './hooks/useSmartFilter.js';
import { useEmailActions } from './hooks/useEmailActions.js';
import { useAISummary } from './hooks/useAISummary.js';
import { ConfirmationPrompt } from './components/ConfirmationPrompt.js';

interface AppProps {
  client: GmailClient;
  cache: EmailCache;
}

export function InboxApp({ client, cache }: AppProps) {
  const { emails, isLoading, error, fetchEmailDetail, refresh } = useGmail({ client, cache });
  const [removedEmailIds, setRemovedEmailIds] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [summaries, setSummaries] = useState<
    Map<string, import('../core/models/index.js').EmailSummary>
  >(new Map());
  const lastFetchedId = useRef<string | null>(null);
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;

  const { generateSummary } = useAISummary({ cache });

  const selectedEmailRef = useRef<import('../core/models/index.js').Email | null>(null);

  const toggleSummary = useCallback(async () => {
    const currentEmail = selectedEmailRef.current;
    if (!showSummary && currentEmail && !summaries.has(currentEmail.id)) {
      const summary = await generateSummary(currentEmail);
      if (summary) {
        setSummaries((prev) => new Map(prev).set(currentEmail.id, summary));
      }
    }
    setShowSummary((prev) => !prev);
  }, [showSummary, summaries, generateSummary]);

  // Filter out removed emails from display
  const displayEmails = emails.filter((email) => !removedEmailIds.has(email.id));

  const handleEmailRemoved = useCallback((emailId: string) => {
    setRemovedEmailIds((prev) => new Set([...prev, emailId]));
  }, []);

  const {
    state: actionState,
    archiveEmail,
    deleteEmail,
    confirmDelete,
    cancelDelete,
    clearLastAction,
  } = useEmailActions({
    client,
    onEmailRemoved: handleEmailRemoved,
    onSuccess: refresh,
  });

  // Clear action status message after 3 seconds
  useEffect(() => {
    if (actionState.lastAction) {
      const timer = setTimeout(() => {
        clearLastAction();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionState.lastAction, clearLastAction]);

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

  const filteredDisplayEmails =
    filterState === 'filtered'
      ? filteredEmails.filter((email) => !removedEmailIds.has(email.id))
      : displayEmails;

  const keyboard = useKeyboard({
    itemCount: filteredDisplayEmails.length,
    selectedIndex: 0,
    onSelect: () => {},
    onRefresh: refresh,
    pageSize: 10,
    filterState,
    onActivateFilter: activateFilter,
    onClearFilter: clearFilter,
    getSelectedEmailId: () => filteredDisplayEmails[keyboard.selectedIndex]?.id,
    onArchive: archiveEmail,
    onDelete: deleteEmail,
    onConfirmDelete: confirmDelete,
    onCancelDelete: cancelDelete,
    confirmationState: actionState.showDeleteConfirmation ? 'confirming' : 'idle',
    onToggleSummary: toggleSummary,
  });

  const selectedEmail = filteredDisplayEmails[keyboard.selectedIndex];

  useEffect(() => {
    selectedEmailRef.current = selectedEmail || null;
  }, [selectedEmail]);

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
        <Text dimColor> ({displayEmails.length} emails)</Text>
        {filterState === 'filtered' && <Text dimColor> | Filter: "{filterDescription}"</Text>}
      </Box>

      {/* Main content - split pane */}
      <Box flexDirection="row" height={contentHeight}>
        {/* Left: Email list */}
        <Box width="50%" height={contentHeight} overflow="hidden">
          <EmailList
            emails={filteredDisplayEmails}
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
            email={
              selectedEmail
                ? {
                    ...selectedEmail,
                    summary: summaries.get(selectedEmail.id) ?? selectedEmail.summary ?? null,
                  }
                : undefined
            }
            maxHeight={contentHeight}
            scrollOffset={keyboard.previewScrollOffset}
            showSummary={showSummary}
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

      {/* Delete confirmation prompt */}
      <ConfirmationPrompt
        visible={actionState.showDeleteConfirmation}
        emailSubject={selectedEmail?.subject ?? ''}
      />

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          {filterState === 'input' || filterState === 'loading'
            ? 'Enter to filter • Escape to cancel'
            : 'j/k or ↑↓ to navigate • Enter to preview • e to archive • # to delete • f to filter • s to toggle summary • q to quit'}
        </Text>
        {filterState === 'filtered' && <Text dimColor> • Esc to clear filter</Text>}
        {showSummary && <Text dimColor> • [Summary View]</Text>}
      </Box>

      {/* Action status message */}
      {actionState.lastAction && (
        <Box marginTop={1}>
          {actionState.lastAction.type === 'success' ? (
            <Text color="green">
              {actionState.lastAction.action === 'archive' ? '✓ Email archived' : '✓ Email deleted'}
            </Text>
          ) : (
            <Text color="red">
              ✗ {actionState.lastAction.action === 'archive' ? 'Archive' : 'Delete'} failed:{' '}
              {actionState.lastAction.error}
            </Text>
          )}
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
