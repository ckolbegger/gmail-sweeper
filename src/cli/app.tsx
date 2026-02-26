/**
 * Main CLI App Component
 *
 * The main TUI application that wires everything together.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, useStdout, useStdin } from 'ink';
import { EmailList } from './components/email-list.js';
import { EmailDetail } from './components/email-detail.js';
import { EmailPreview } from './components/email-preview.js';
import { FilterInput } from './components/filter-input.js';
import { useSmartFilter } from './hooks/use-smart-filter.js';
import type { Email } from '../core/contracts/types.js';
import type { EmailRepository } from '../core/services/email-repository.js';
import type { GmailClient } from '../core/contracts/gmail-api.js';
import { logger } from '../core/logging/index.js';
import { getDefaultDatabase } from '../core/persistence/database.js';

export interface AppProps {
  gmailClient: GmailClient;
  emailRepository: EmailRepository;
}

type AppView = 'list' | 'detail' | 'loading' | 'error';

export function App({ gmailClient, emailRepository }: AppProps): React.ReactElement {
  const { exit } = useApp();

  // Cleanup function to close database and exit
  const cleanupAndExit = useCallback(() => {
    // Close database connection
    const db = getDefaultDatabase();
    db.close();
    // Exit the app (Ink unmount)
    exit();
    // Force process termination to ensure clean exit
    process.exit(0);
  }, [exit]);
  const { stdout } = useStdout();
  const { setRawMode } = useStdin();
  const terminalHeight = stdout.rows;
  const terminalWidth = stdout.columns;

  // Ensure stdin is in raw mode for keyboard input
  // Only run once on mount, cleanup on unmount
  useEffect(() => {
    if (setRawMode) {
      setRawMode(true);
    }
    return () => {
      if (setRawMode) {
        setRawMode(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [view, setView] = useState<AppView>('loading');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState('');
  const [previewScrollOffset, setPreviewScrollOffset] = useState(0);
  const [paginationOffset, setPaginationOffset] = useState(0);
  const [totalEmailCount, setTotalEmailCount] = useState(0);
  const PAGE_SIZE = 50;

  const smartFilter = useSmartFilter(emails);
  const displayEmails =
    smartFilter.filteredResults?.matchingResults
      .map((r) => {
        const email = emails.find((e) => e.id === r.emailId);
        return email;
      })
      .filter((e): e is Email => e !== undefined) || emails;
  const filterCount = smartFilter.filteredResults?.matchingResults.length;
  const totalCount = emails.length;

  // Calculate pagination display range
  const currentPageStart = paginationOffset + 1;
  const currentPageEnd = Math.min(paginationOffset + PAGE_SIZE, totalEmailCount);
  const paginationRangeText = `${currentPageStart}-${currentPageEnd} of ${totalEmailCount}`;

  // Initial sync on mount
  useEffect(() => {
    const syncEmails = async () => {
      try {
        // Check if authenticated
        const isAuthenticated = await gmailClient.auth.isAuthenticated();
        if (!isAuthenticated) {
          setErrorMessage('Not authenticated. Run: gmail-sweep auth');
          setView('error');
          return;
        }

        // Try to load emails from local database first
        const localEmails = await emailRepository.list({ limit: PAGE_SIZE, offset: 0 });
        if (localEmails.items.length > 0) {
          setEmails(localEmails.items);
          setTotalEmailCount(localEmails.total);
          setView('list');
        }

        // Sync with Gmail
        setSyncProgress('Syncing with Gmail...');
        const result = await gmailClient.fullSync({
          batchSize: 100,
          onProgress: (progress) => {
            setSyncProgress(`Synced ${progress.processedCount} emails...`);
          },
        });

        // Save synced emails to database
        for (const email of result.emails) {
          await emailRepository.save(email);
        }

        // Reload from database
        const updatedEmails = await emailRepository.list({ limit: PAGE_SIZE, offset: paginationOffset });
        setEmails(updatedEmails.items);
        setTotalEmailCount(updatedEmails.total);
        setSyncProgress('');
        setView('list');

        logger.info(`Synced ${result.emails.length} emails`);
      } catch (error) {
        logger.error('Failed to sync emails', error);
        setErrorMessage(error instanceof Error ? error.message : 'Sync failed');
        setView('error');
      }
    };

    syncEmails();
  }, [gmailClient, emailRepository]);

  // Reset preview scroll when selection changes
  useEffect(() => {
    setPreviewScrollOffset(0);
  }, [selectedIndex]);

  // Calculate preview viewport size for scrolling
  const previewHeaderLines = 3; // Header with border
  const previewFooterLines = 3; // Footer with border
  const previewViewportLines = Math.max(
    5,
    terminalHeight - previewHeaderLines - previewFooterLines
  );
  const previewScrollAmount = Math.floor(previewViewportLines / 2);

  useInput((input, key) => {
    if (view === 'list') {
      if (smartFilter.state === 'input') {
        if (key.escape) {
          smartFilter.clearFilter();
        }
        return;
      }

      if (key.upArrow && key.ctrl) {
        // Ctrl+Up: Previous page
        const prevOffset = Math.max(0, paginationOffset - PAGE_SIZE);
        if (prevOffset !== paginationOffset) {
          setView('loading');
          setSyncProgress('Loading...');
          emailRepository
            .list({ limit: PAGE_SIZE, offset: prevOffset })
            .then((result) => {
              setEmails(result.items);
              setPaginationOffset(prevOffset);
              setTotalEmailCount(result.total);
              setSelectedIndex(0);
              setSyncProgress('');
              setView('list');
            })
            .catch((err) => {
              setErrorMessage(err.message);
              setView('error');
            });
        }
      } else if (key.downArrow && key.ctrl) {
        // Ctrl+Down: Next page
        const nextOffset = paginationOffset + PAGE_SIZE;
        if (nextOffset < totalEmailCount) {
          setView('loading');
          setSyncProgress('Loading...');
          emailRepository
            .list({ limit: PAGE_SIZE, offset: nextOffset })
            .then((result) => {
              setEmails(result.items);
              setPaginationOffset(nextOffset);
              setTotalEmailCount(result.total);
              setSelectedIndex(0);
              setSyncProgress('');
              setView('list');
            })
            .catch((err) => {
              setErrorMessage(err.message);
              setView('error');
            });
        }
      } else if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(displayEmails.length - 1, prev + 1));
      } else if (input === '[') {
        setPreviewScrollOffset((prev) => Math.max(0, prev - previewScrollAmount));
      } else if (input === ']') {
        const selectedEmail = displayEmails[selectedIndex];
        if (selectedEmail) {
          const bodyLines = (selectedEmail.body.text || '').split('\n').length;
          const maxLines = Math.max(5, terminalHeight - 17);
          setPreviewScrollOffset((prev) =>
            Math.min(prev + previewScrollAmount, Math.max(0, bodyLines - maxLines))
          );
        }
      } else if (key.return) {
        const email = displayEmails[selectedIndex];
        if (email) {
          setSelectedEmail(email);
          setView('detail');
        }
      } else if (input === 'f') {
        smartFilter.activateFilter();
      } else if (key.escape) {
        smartFilter.clearFilter();
      } else if (input === 'q') {
        cleanupAndExit();
      } else if (input === 'r') {
        setView('loading');
        setSyncProgress('Refreshing...');
        gmailClient
          .fullSync({ batchSize: 100 })
          .then(async (result) => {
            for (const email of result.emails) {
              await emailRepository.save(email);
            }
            const updated = await emailRepository.list({ limit: PAGE_SIZE, offset: paginationOffset });
            setEmails(updated.items);
            setTotalEmailCount(updated.total);
            setSyncProgress('');
            setView('list');
          })
          .catch((err) => {
            setErrorMessage(err.message);
            setView('error');
          });
      }
    } else if (view === 'detail') {
      if (key.escape || input === 'q') {
        setView('list');
        setSelectedEmail(null);
      }
    }
  });

  // Loading view
  if (view === 'loading') {
    return React.createElement(
      Box,
      { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { color: 'cyan' }, 'Gmail Sweep'),
      React.createElement(Text, null, syncProgress || 'Loading...')
    );
  }

  // Error view
  if (view === 'error') {
    return React.createElement(
      Box,
      { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { color: 'red', bold: true }, 'Error'),
      React.createElement(Text, null, errorMessage),
      React.createElement(Text, { color: 'gray' }, 'Press q to quit')
    );
  }

  // Detail view - full screen
  if (view === 'detail' && selectedEmail) {
    return React.createElement(
      Box,
      { flexDirection: 'column', height: terminalHeight },
      React.createElement(EmailDetail, {
        email: selectedEmail,
        terminalHeight: terminalHeight,
      })
    );
  }

  const headerLines = 3;
  const footerLines = 3;
  const indicatorLines = 2;
  const availableLines = terminalHeight - headerLines - footerLines - indicatorLines;
  const emailLineHeight = 2;
  const maxVisibleEmails = Math.max(3, Math.floor(availableLines / emailLineHeight));

  const leftPaneWidth = Math.floor(terminalWidth / 2);
  const rightPaneWidth = terminalWidth - leftPaneWidth - 1;

  const currentEmail = displayEmails[selectedIndex];

  return React.createElement(
    Box,
    { flexDirection: 'column', height: terminalHeight },
    React.createElement(
      Box,
      {
        padding: 1,
        borderStyle: 'single',
        borderBottom: true,
        flexShrink: 0,
      },
      React.createElement(Text, { bold: true, color: 'cyan' }, 'Gmail Sweep'),
      smartFilter.filterDescription
        ? React.createElement(
            Text,
            null,
            ` | ${smartFilter.filterDescription} | ${paginationRangeText} | ? for help`
          )
        : React.createElement(Text, null, ` | ${paginationRangeText} | ? for help`)
    ),
    smartFilter.state === 'input' || smartFilter.state === 'loading' || smartFilter.state === 'error'
      ? React.createElement(
          Box,
          {
            flexDirection: 'column',
            flexGrow: 1,
            padding: 1,
          },
          React.createElement(FilterInput, {
            onSubmit: (description) => smartFilter.submitFilter(description),
            isLoading: smartFilter.state === 'loading',
            error: smartFilter.error,
          })
        )
      : React.createElement(
          Box,
          {
            flexDirection: 'row',
            flexGrow: 1,
            overflow: 'hidden',
          },
          React.createElement(
            Box,
            {
              width: leftPaneWidth,
              flexDirection: 'column',
            },
            React.createElement(EmailList, {
              emails: displayEmails,
              selectedIndex,
              onSelect: (id) => {
                const email = displayEmails.find((e) => e.id === id);
                if (email) {
                  setSelectedEmail(email);
                  setView('detail');
                }
              },
              onSelectionChange: setSelectedIndex,
              maxVisible: maxVisibleEmails,
              filterCount,
              totalCount,
            })
          ),
          // Right pane: Email preview (with left border as separator)
          React.createElement(
            Box,
            {
              width: rightPaneWidth,
              flexDirection: 'column',
              borderStyle: 'single',
              borderLeft: true,
              borderTop: false,
              borderRight: false,
              borderBottom: false,
              overflow: 'hidden',
            },
            currentEmail
              ? React.createElement(EmailPreview, {
                  email: currentEmail,
                  terminalHeight: terminalHeight - headerLines - footerLines,
                  scrollOffset: previewScrollOffset,
                  width: rightPaneWidth - 2, // Account for border
                })
              : React.createElement(
                  Box,
                  { padding: 1 },
                  React.createElement(Text, { color: 'gray' }, 'No email selected')
                )
          )
        ),
    React.createElement(
      Box,
      {
        padding: 1,
        borderStyle: 'single',
        borderTop: true,
        flexShrink: 0,
      },
      React.createElement(
        Text,
        { color: 'gray' },
        '↑↓ navigate | Ctrl+↑↓ page | [ ] scroll | Enter view | f filter | Esc clear | r refresh | q quit'
      )
    )
  );
}
