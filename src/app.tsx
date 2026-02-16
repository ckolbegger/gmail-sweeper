import React, { useState, useMemo, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import { useGmail } from './hooks/useGmail';
import { InboxList } from './components/Inbox/InboxList';
import { EmailDetail } from './components/Inbox/EmailDetail';
import { GmailService } from './services/gmail/gmailService';
import { Email } from './types';
import { IEmailService } from './types/interfaces';
import { resolveAiConfig } from './services/ai/config';
import { createAiProvider } from './services/ai/provider';
import { useSmartFilter } from './hooks/useSmartFilter';
import { FilterInput } from './components/Shared/FilterInput';

interface AppProps {
    limit?: number;
    service?: IEmailService;
}

export default function App({ limit = 10, service: providedService }: AppProps) {
    const service = useMemo(() => providedService || new GmailService(), [providedService]);
    const { emails, loading, error: fetchError } = useGmail(service, { maxResults: limit });
    
    // AI Provider
    const aiProvider = useMemo(() => {
        const config = resolveAiConfig();
        return config ? createAiProvider(config) : null;
    }, []);

    const { 
        status: filterStatus, 
        results: filterResults, 
        applyFilter, 
        progress: filterProgress, 
        error: filterError 
    } = useSmartFilter(emails, aiProvider);
    
    const [isFiltering, setIsFiltering] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [terminalDimensions, setTerminalDimensions] = useState({
        columns: process.stdout.columns || 100,
        rows: process.stdout.rows || 24
    });

    // Filtered emails
    const displayEmails = useMemo(() => {
        if (filterStatus === 'idle' || filterStatus === 'loading') return emails;
        
        const matchedIds = new Set(filterResults.map(r => r.emailId));
        return emails.filter(e => matchedIds.has(e.id))
            .sort((a, b) => {
                const confA = filterResults.find(r => r.emailId === a.id)?.confidence || 0;
                const confB = filterResults.find(r => r.emailId === b.id)?.confidence || 0;
                return confB - confA;
            });
    }, [emails, filterStatus, filterResults]);

    useEffect(() => {
        const updateDimensions = () => {
            setTerminalDimensions({
                columns: process.stdout.columns,
                rows: process.stdout.rows
            });
        };
        process.stdout.on('resize', updateDimensions);
        return () => {
            process.stdout.off('resize', updateDimensions);
        };
    }, []);

    // Reset focus if emails change
    useEffect(() => {
        if (displayEmails && displayEmails.length > 0) {
            setFocusedIndex(0);
        }
    }, [displayEmails]);

    useInput((input: string, key) => {
        if (isFiltering) return;

        if (key.escape) {
            if (selectedEmail) {
                setSelectedEmail(null);
            } else {
                process.exit(0);
            }
        }

        if (input === 'f' && !selectedEmail) {
            setIsFiltering(true);
            return;
        }

        if (!selectedEmail) {
            if (key.upArrow) {
                setFocusedIndex(prev => Math.max(0, prev - 1));
            }
            if (key.downArrow) {
                const count = displayEmails?.length || 0;
                setFocusedIndex(prev => Math.min(count - 1, prev + 1));
            }
            if (key.return) {
                if (displayEmails && displayEmails[focusedIndex]) {
                    setSelectedEmail(displayEmails[focusedIndex]);
                }
            }
        }
    });

    const handleFilterSubmit = (description: string) => {
        setIsFiltering(false);
        applyFilter(description);
    };

    const handleFilterCancel = () => {
        setIsFiltering(false);
    };

    const error = fetchError || filterError;

    return (
        <Box flexDirection="column" padding={1} width={terminalDimensions.columns} height={terminalDimensions.rows}>
            <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1} flexShrink={0} justifyContent="space-between">
                <Text bold color="green">Gmail Sweep (v0.1.0)</Text>
                {filterStatus !== 'idle' && (
                    <Text color="cyan">
                        {filterStatus === 'loading' ? 'Filtering... ' : 'Filtered: '}
                        {filterResults.length}/{emails.length}
                    </Text>
                )}
            </Box>

            {isFiltering && (
                <Box borderStyle="single" borderColor="cyan" paddingX={1} marginBottom={1}>
                    <FilterInput onSubmit={handleFilterSubmit} onCancel={handleFilterCancel} />
                </Box>
            )}

            {loading && (
                <Box padding={1} flexGrow={1}>
                    <Text color="yellow">Loading emails (check browser for auth if needed)...</Text>
                </Box>
            )}

            {error && (
                <Box padding={1} flexGrow={1}>
                    <Text color="red">Error: {error}</Text>
                </Box>
            )}

            {!loading && !error && (
                <Box flexDirection="row" flexGrow={1} overflow="hidden">
                    <Box width="40%" flexDirection="column">
                        <InboxList 
                            emails={displayEmails} 
                            focusedIndex={focusedIndex}
                            terminalWidth={terminalDimensions.columns}
                            terminalHeight={terminalDimensions.rows}
                            dimmed={filterStatus === 'loading'}
                        />
                    </Box>
                    <Box width="60%" marginLeft={2}>
                        <EmailDetail 
                            email={selectedEmail} 
                            isActive={!!selectedEmail} 
                            terminalWidth={terminalDimensions.columns}
                            terminalHeight={terminalDimensions.rows}
                        />
                    </Box>
                </Box>
            )}

            <Box marginTop={1} borderStyle="classic" borderColor="gray" paddingX={1} flexShrink={0}>
                <Text color="gray"> 
                    {selectedEmail 
                        ? ' [Esc] Close Detail  [Arrows] Scroll ' 
                        : ' [Arrows] Navigate  [Enter] View  [f] Filter  [Esc] Exit '}
                </Text>
            </Box>
        </Box>
    );
}