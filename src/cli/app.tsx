/**
 * Main CLI App Structure
 *
 * Entry point for the TUI application.
 */

import { Box, Text, render, useApp, useInput, useStdout } from 'ink';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync } from 'node:fs';
import { EmailList } from './components/email-list.js';
import { EmailDetail } from './components/email-detail.js';
import { FilterInput } from './components/filter-input.js';
import type { Email } from '../core/models/email.js';
import { useKeyboard } from './hooks/use-keyboard.js';
import { useSmartFilter } from './hooks/use-smart-filter.js';
import { getDatabase } from '../core/persistence/database.js';
import { EmailRepository } from '../core/services/email-repository.js';
import { GmailClient } from '../core/services/gmail-client.js';
import { EmailSorter } from '../core/services/email-sorter.js';
import { EmailFilter } from '../core/services/email-filter.js';
import type { GmailClientConfig } from '../core/contracts/gmail-api.js';
import { HELP_SECTIONS } from './help.js';
import { toConfidenceLevel, type ConfidenceLevel } from '../core/ai/provider.js';

type AppView = 'loading' | 'auth' | 'email-list' | 'error';
type FilterMode = 'sender' | 'label' | 'category' | 'ai';

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [view, setView] = useState<AppView>('loading');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [sort, setSort] = useState<{
    field: 'date' | 'sender' | 'subject' | 'label' | 'category';
    direction: 'asc' | 'desc';
  }>({
    field: 'date',
    direction: 'desc',
  });
  const [filters, setFilters] = useState<{
    sender?: string;
    label?: string;
    category?: string;
    unreadOnly: boolean;
  }>({ unreadOnly: false });
  const [filterMode, setFilterMode] = useState<FilterMode | null>(null);
  const [filterInput, setFilterInput] = useState('');
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for refresh functionality
  const emailRepositoryRef = useRef<EmailRepository | null>(null);
  const gmailClientRef = useRef<GmailClient | null>(null);

  // Smart filter hook for AI-powered filtering
  const smartFilter = useSmartFilter();

  const emailSorter = useMemo(() => new EmailSorter(), []);
  const emailFilter = useMemo(() => new EmailFilter(), []);

  const selectInitialEmail = useCallback((loadedEmails: Email[]) => {
    if (loadedEmails.length > 0) {
      setSelectedEmailId((prev) =>
        prev && loadedEmails.some((email) => email.id === prev) ? prev : loadedEmails[0].id
      );
    } else {
      setSelectedEmailId(undefined);
    }
  }, []);

  const resolveDatabasePath = (): string => {
    if (process.env.DATABASE_PATH) {
      return process.env.DATABASE_PATH;
    }

    return join(homedir(), '.local', 'share', 'gmail-sweep', 'emails.db');
  };

  const readGmailConfig = (): GmailClientConfig | null => {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }

    return { clientId, clientSecret, redirectUri };
  };

  const hydrateFromLocalStore = useCallback(
    async (emailRepository: EmailRepository): Promise<Email[]> => {
      const localResult = await emailRepository.list({ page: 1, pageSize: 500 });
      return localResult.items;
    },
    []
  );

  const syncFromGmail = useCallback(
    async (emailRepository: EmailRepository, gmailClient: GmailClient): Promise<Email[]> => {
      setStatusMessage('Syncing inbox...');

      const remoteResult = await gmailClient.listEmails({ page: 1, pageSize: 200 });
      setStatusMessage(`Fetched ${remoteResult.items.length} emails from Gmail`);

      for (const email of remoteResult.items) {
        await emailRepository.save(email);
      }

      return hydrateFromLocalStore(emailRepository);
    },
    [hydrateFromLocalStore]
  );

  // Refresh emails from Gmail
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    if (!emailRepositoryRef.current || !gmailClientRef.current) {
      setStatusMessage('Cannot refresh: not connected to Gmail');
      return;
    }

    setIsRefreshing(true);
    setStatusMessage('Refreshing emails...');

    try {
      const isAuthenticated = await gmailClientRef.current.auth.isAuthenticated();
      if (!isAuthenticated) {
        setStatusMessage('Not authenticated with Gmail. Run: gmail-sweep auth');
        return;
      }

      const loadedEmails = await syncFromGmail(emailRepositoryRef.current, gmailClientRef.current);
      setEmails(loadedEmails);
      setStatusMessage(`Refreshed: ${loadedEmails.length} emails`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, syncFromGmail]);

  // Initialize app and load emails
  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        setView('loading');

        const dbPath = resolveDatabasePath();
        mkdirSync(dirname(dbPath), { recursive: true });

        const db = getDatabase({ path: dbPath });
        const emailRepository = new EmailRepository(db);
        emailRepositoryRef.current = emailRepository;
        let loadedEmails = await hydrateFromLocalStore(emailRepository);

        const config = readGmailConfig();
        if (!config) {
          if (!active) {
            return;
          }

          if (loadedEmails.length > 0) {
            setEmails(loadedEmails);
            selectInitialEmail(loadedEmails);
            setStatusMessage('Showing locally cached emails');
            setView('email-list');
          } else {
            setView('auth');
          }
          return;
        }

        const gmailClient = new GmailClient(config);
        gmailClientRef.current = gmailClient;
        const isAuthenticated = await gmailClient.auth.isAuthenticated();

        if (isAuthenticated) {
          loadedEmails = await syncFromGmail(emailRepository, gmailClient);
        }

        if (!active) {
          return;
        }

        if (loadedEmails.length > 0) {
          setEmails(loadedEmails);
          selectInitialEmail(loadedEmails);
          setView('email-list');
          return;
        }

        setView(isAuthenticated ? 'email-list' : 'auth');
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Unknown initialization error');
        setView('error');
      }
    };

    void initialize();

    return () => {
      active = false;
    };
  }, [hydrateFromLocalStore, selectInitialEmail, syncFromGmail]);

  const handleSort = useCallback((field: 'date' | 'sender' | 'subject' | 'label' | 'category') => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  // Handle email selection
  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedEmailId(email.id);
  }, []);

  // T040: Build confidence map from smart filter classifications
  const confidenceMap = useMemo(() => {
    if (smartFilter.state !== 'filtered' || smartFilter.classifications.length === 0) {
      return undefined;
    }

    const map = new Map<string, ConfidenceLevel>();
    for (const classification of smartFilter.classifications) {
      const level = toConfidenceLevel(classification.confidence);
      map.set(classification.emailId, level);
    }
    return map;
  }, [smartFilter.state, smartFilter.classifications]);

  const displayedEmails = useMemo(() => {
    // If smart filter is active with results, use those
    if (smartFilter.state === 'filtered' && smartFilter.filteredEmails.length >= 0) {
      let result = smartFilter.filteredEmails;

      if (filters.unreadOnly) {
        result = emailFilter.filterByReadStatus(result, false);
      }

      switch (sort.field) {
        case 'date':
          return emailSorter.sortByDate(result, sort.direction);
        case 'sender':
          return emailSorter.sortBySender(result, sort.direction);
        case 'subject':
          return emailSorter.sortBySubject(result, sort.direction);
        case 'label':
          return emailSorter.sortByLabel(result, sort.direction);
        case 'category':
          return emailSorter.sortByCategory(result, sort.direction);
      }
    }

    let result = emails;

    if (filters.sender) {
      result = emailFilter.filterBySender(result, filters.sender);
    }

    if (filters.label) {
      result = emailFilter.filterByLabel(result, filters.label);
    }

    if (filters.category) {
      result = result.filter(
        (email) => email.category?.toLowerCase() === filters.category?.toLowerCase()
      );
    }

    if (filters.unreadOnly) {
      result = emailFilter.filterByReadStatus(result, false);
    }

    switch (sort.field) {
      case 'date':
        return emailSorter.sortByDate(result, sort.direction);
      case 'sender':
        return emailSorter.sortBySender(result, sort.direction);
      case 'subject':
        return emailSorter.sortBySubject(result, sort.direction);
      case 'label':
        return emailSorter.sortByLabel(result, sort.direction);
      case 'category':
        return emailSorter.sortByCategory(result, sort.direction);
    }
  }, [emails, filters, sort, emailFilter, emailSorter, smartFilter.state, smartFilter.filteredEmails]);

  const selectedEmail = useMemo(
    () =>
      displayedEmails.find((email) => email.id === selectedEmailId) ?? displayedEmails[0] ?? null,
    [displayedEmails, selectedEmailId]
  );

  // Handle email archive
  const handleArchiveEmail = useCallback(async (emailId: string) => {
    if (!gmailClientRef.current || !selectedEmail) return;

    setStatusMessage('Archiving...');
    const result = await gmailClientRef.current.archiveEmails([emailId]);

    if (result.successfulCount > 0) {
      // Remove from local database to persist across restarts
      if (emailRepositoryRef.current) {
        await emailRepositoryRef.current.delete(emailId);
      }

      const currentIndex = displayedEmails.findIndex((e) => e.id === emailId);
      const newEmails = emails.filter((e) => e.id !== emailId);
      setEmails(newEmails);

      // Auto-advance selection
      if (currentIndex >= 0) {
        const nextEmail = displayedEmails[currentIndex + 1] || displayedEmails[currentIndex - 1];
        setSelectedEmailId(nextEmail?.id);
      }

      setStatusMessage('Archived 1 email');
    } else {
      setStatusMessage(`Archive failed: ${result.failures[0]?.error ?? 'Unknown error'}`);
    }
  }, [emails, displayedEmails, selectedEmail]);

  // Handle email delete
  const handleDeleteEmail = useCallback(async (emailId: string) => {
    if (!gmailClientRef.current || !selectedEmail) return;

    setStatusMessage('Deleting...');
    const result = await gmailClientRef.current.deleteEmails([emailId]);

    if (result.successfulCount > 0) {
      // Remove from local database to persist across restarts
      if (emailRepositoryRef.current) {
        await emailRepositoryRef.current.delete(emailId);
      }

      const currentIndex = displayedEmails.findIndex((e) => e.id === emailId);
      const newEmails = emails.filter((e) => e.id !== emailId);
      setEmails(newEmails);

      // Auto-advance selection
      if (currentIndex >= 0) {
        const nextEmail = displayedEmails[currentIndex + 1] || displayedEmails[currentIndex - 1];
        setSelectedEmailId(nextEmail?.id);
      }

      setStatusMessage('Deleted 1 email');
    } else {
      setStatusMessage(`Delete failed: ${result.failures[0]?.error ?? 'Unknown error'}`);
    }
  }, [emails, displayedEmails, selectedEmail]);

  // Handle saving summary to database
  const handleSaveSummary = useCallback(async (emailId: string, summary: string) => {
    if (!emailRepositoryRef.current) return;

    try {
      const email = await emailRepositoryRef.current.getById(emailId);
      if (email) {
        email.summary = summary;
        await emailRepositoryRef.current.save(email);
        // Update local state to reflect the saved summary
        setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, summary } : e)));
      }
    } catch (error) {
      setStatusMessage(`Failed to save summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const configuredDetailMargin = Number.parseInt(process.env.DETAIL_BODY_MARGIN ?? '10', 10);
  const detailBodyMargin = Number.isFinite(configuredDetailMargin)
    ? Math.min(20, Math.max(4, configuredDetailMargin))
    : 10;
  const maxDetailBodyColumns = Math.max(
    22,
    Math.floor((stdout.columns ?? 80) * 0.35) - detailBodyMargin
  );
  const hasFooterDetail =
    filterMode !== null ||
    smartFilter.state === 'filtered' ||
    smartFilter.state === 'loading' ||
    Boolean(filters.sender) ||
    Boolean(filters.label) ||
    Boolean(filters.category) ||
    filters.unreadOnly;
  const headerLines = 3;
  const footerLines = hasFooterDetail ? 4 : 3;
  const mainPaneHeight = Math.max(10, (stdout.rows ?? 24) - headerLines - footerLines);
  const listRowsForEmails = Math.max(4, mainPaneHeight - 4);
  const detailBodyLines = Math.max(3, mainPaneHeight - 9);

  useEffect(() => {
    setDetailScrollOffset(0);
  }, [selectedEmailId]);

  const applyFilterInput = useCallback(() => {
    const value = filterInput.trim();

    if (filterMode === 'sender') {
      setFilters((prev) => ({ ...prev, sender: value || undefined }));
    }

    if (filterMode === 'label') {
      setFilters((prev) => ({ ...prev, label: value || undefined }));
    }

    if (filterMode === 'category') {
      setFilters((prev) => ({ ...prev, category: value || undefined }));
    }

    setFilterInput('');
    setFilterMode(null);
  }, [filterInput, filterMode]);

  useInput((input, key) => {
    if (showHelp && (input === '?' || key.escape)) {
      setShowHelp(false);
      return;
    }

    if (showHelp) {
      return;
    }

    if (!filterMode) {
      return;
    }

    if (key.return) {
      applyFilterInput();
      return;
    }

    if (key.escape) {
      if (filterMode === 'ai') {
        smartFilter.clearFilter();
      }
      setFilterInput('');
      setFilterMode(null);
      return;
    }

    if (key.backspace || key.delete) {
      setFilterInput((prev) => prev.slice(0, -1));
      return;
    }

    if (input.length === 1) {
      setFilterInput((prev) => prev + input);
    }
  });

  // Global keyboard shortcuts
  useKeyboard({
    shortcuts: [
      {
        key: '?',
        handler: () => {
          setShowHelp((prev) => {
            const next = !prev;
            if (next) {
              setFilterMode(null);
              setFilterInput('');
            }
            return next;
          });
          return;
        },
        description: 'Toggle help panel',
      },
      {
        key: 'q',
        handler: () => {
          if (showHelp) {
            setShowHelp(false);
            return;
          }

          exit();
        },
        description: 'Quit',
      },
      {
        key: '.',
        handler: () => {
          if (filterMode || showHelp || isRefreshing) {
            return false;
          }

          void handleRefresh();
          return;
        },
        description: 'Refresh emails from Gmail',
      },
      {
        key: 'd',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          handleSort('date');
          return;
        },
        description: 'Sort by date',
      },
      {
        key: 'u',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          handleSort('subject');
          return;
        },
        description: 'Sort by subject',
      },
      {
        key: 'b',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          handleSort('label');
          return;
        },
        description: 'Sort by label',
      },
      {
        key: 'g',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          handleSort('category');
          return;
        },
        description: 'Sort by category',
      },
      {
        key: 'f',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          setFilterMode('sender');
          setFilterInput(filters.sender ?? '');
          return;
        },
        description: 'Filter by sender',
      },
      {
        key: 'l',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          setFilterMode('label');
          setFilterInput(filters.label ?? '');
          return;
        },
        description: 'Filter by label',
      },
      {
        key: 'c',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          setFilterMode('category');
          setFilterInput(filters.category ?? '');
          return;
        },
        description: 'Filter by category',
      },
      {
        key: 'a',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          smartFilter.activateFilter();
          setFilterMode('ai');
          return;
        },
        description: 'AI-powered filter',
      },
      {
        key: 'r',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          setFilters((prev) => ({ ...prev, unreadOnly: !prev.unreadOnly }));
          return;
        },
        description: 'Toggle unread filter',
      },
      {
        key: 'x',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          setFilters({ unreadOnly: false });
          smartFilter.clearFilter();
          return;
        },
        description: 'Clear filters',
      },
      {
        key: '[',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          setDetailScrollOffset((prev) =>
            Math.max(0, prev - Math.max(1, Math.floor(detailBodyLines / 2)))
          );
          return;
        },
        description: 'Scroll detail up',
      },
      {
        key: ']',
        handler: () => {
          if (filterMode || showHelp) {
            return false;
          }

          setDetailScrollOffset((prev) => prev + Math.max(1, Math.floor(detailBodyLines / 2)));
          return;
        },
        description: 'Scroll detail down',
      },
      {
        key: 'e',
        handler: () => {
          if (filterMode || showHelp || isRefreshing || !selectedEmail) {
            return false;
          }

          void handleArchiveEmail(selectedEmail.id);
          return;
        },
        description: 'Archive selected email',
      },
      {
        key: '#',
        handler: () => {
          if (filterMode || showHelp || isRefreshing || !selectedEmail) {
            return false;
          }

          void handleDeleteEmail(selectedEmail.id);
          return;
        },
        description: 'Delete selected email',
      },
    ],
  });

  // Render loading view
  if (view === 'loading') {
    return (
      <Box padding={1}>
        <Text>Loading Gmail Sweep...</Text>
        <Text dimColor>{statusMessage}</Text>
      </Box>
    );
  }

  // Render auth view
  if (view === 'auth') {
    return (
      <Box padding={1}>
        <Text>Please authenticate with Gmail first</Text>
        <Text dimColor>
          {' '}
          Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI and run: gmail-sweep auth
        </Text>
      </Box>
    );
  }

  // Render error view
  if (view === 'error') {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press q to quit</Text>
      </Box>
    );
  }

  // Render main email list view
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box paddingX={1} paddingY={1} borderStyle="single" borderBottom>
        <Text bold>Gmail Sweep</Text>
        <Text dimColor>
          {' '}
          • {displayedEmails.length}/{emails.length} emails
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" height={mainPaneHeight}>
        {showHelp ? (
          <Box width="100%" height={mainPaneHeight} paddingX={1} paddingY={1} borderStyle="round">
            <Box flexDirection="column" width="100%">
              <Text bold>Keyboard Help</Text>
              <Text dimColor>Press ? or Esc to close</Text>
              <Box marginTop={1} flexDirection="column">
                {HELP_SECTIONS.map((section) => (
                  <Box key={section.title} flexDirection="column" marginBottom={1}>
                    <Text bold>{section.title}</Text>
                    {section.commands.map((command) => (
                      <Text key={`${section.title}-${command.key}`}>
                        {command.key.padEnd(10, ' ')} {command.description}
                      </Text>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        ) : (
          <>
            {/* Email list */}
            <Box width="55%" height={mainPaneHeight} borderStyle="single" borderRight>
              {filterMode === 'ai' && smartFilter.state !== 'filtered' ? (
                <FilterInput
                  onSubmit={(value) => {
                    void smartFilter.submitFilter(value, emails);
                  }}
                  isLoading={smartFilter.state === 'loading'}
                  error={smartFilter.error}
                  progress={smartFilter.progress}
                />
              ) : (
                <EmailList
                  emails={displayedEmails}
                  selectedId={selectedEmailId}
                  onSelect={handleSelectEmail}
                  sort={sort}
                  maxVisibleRows={listRowsForEmails}
                  filterCount={smartFilter.state === 'filtered' ? smartFilter.filteredEmails.length : undefined}
                  totalCount={smartFilter.state === 'filtered' ? emails.length : undefined}
                  confidenceMap={confidenceMap}
                />
              )}
            </Box>

            {/* Email detail */}
            <Box width="45%" height={mainPaneHeight}>
              <EmailDetail
                email={selectedEmail}
                maxBodyLines={detailBodyLines}
                maxBodyColumns={maxDetailBodyColumns}
                scrollOffset={detailScrollOffset}
                onSaveSummary={handleSaveSummary}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Footer */}
      <Box paddingX={1} paddingY={1} borderStyle="single" borderTop flexDirection="column">
        {statusMessage && statusMessage !== 'Initializing...' && (
          <Text dimColor>{statusMessage}</Text>
        )}
        {filterMode === 'ai' && smartFilter.state === 'filtered' && smartFilter.description && (
          <Text dimColor>
            AI filter: &ldquo;{smartFilter.description}&rdquo; ({smartFilter.filteredEmails.length}/{emails.length} emails)
          </Text>
        )}
        {filterMode === 'ai' && smartFilter.state === 'loading' && (
          <Text dimColor>
            AI filter: evaluating...
          </Text>
        )}
        {filterMode && filterMode !== 'ai' && (
          <Text>
            {filterMode} filter: {filterInput || ' '}
            <Text dimColor> (Enter apply, Esc cancel)</Text>
          </Text>
        )}
        {!filterMode &&
          (filters.sender || filters.label || filters.category || filters.unreadOnly) && (
            <Text dimColor>
              Active filters:
              {filters.sender ? ` sender=${filters.sender}` : ''}
              {filters.label ? ` label=${filters.label}` : ''}
              {filters.category ? ` category=${filters.category}` : ''}
              {filters.unreadOnly ? ' unread-only' : ''}
            </Text>
          )}
        <Text dimColor>
          e Archive • # Delete • ↑↓ Navigate • [/] Detail scroll • . Refresh • d/u/b/g Sort • f/l/c/a
          Filter • r Unread • x Clear • ? Help • q Quit
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Render the app
 */
export function renderApp(): void {
  render(<App />);
}
