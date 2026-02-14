import React, { useState, useMemo, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import { useGmail } from './hooks/useGmail';
import { InboxList } from './components/Inbox/InboxList';
import { EmailDetail } from './components/Inbox/EmailDetail';
import { GmailService } from './services/gmail/gmailService';
import { Email } from './types';
import { IEmailService } from './types/interfaces';

interface AppProps {
    limit?: number;
    service?: IEmailService;
}

export default function App({ limit = 10, service: providedService }: AppProps) {
    const service = useMemo(() => providedService || new GmailService(), [providedService]);
    const { emails, loading, error } = useGmail(service, { maxResults: limit });
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [terminalDimensions, setTerminalDimensions] = useState({
        columns: process.stdout.columns || 100,
        rows: process.stdout.rows || 24
    });

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
        if (emails && emails.length > 0) {
            setFocusedIndex(0);
        }
    }, [emails]);

    useInput((_: string, key) => {
        if (key.escape) {
            if (selectedEmail) {
                setSelectedEmail(null);
            } else {
                process.exit(0);
            }
        }

        if (!selectedEmail) {
            if (key.upArrow) {
                setFocusedIndex(prev => Math.max(0, prev - 1));
            }
            if (key.downArrow) {
                const count = emails?.length || 0;
                setFocusedIndex(prev => Math.min(count - 1, prev + 1));
            }
            if (key.return) {
                if (emails && emails[focusedIndex]) {
                    setSelectedEmail(emails[focusedIndex]);
                }
            }
        }
    });

    return (
        <Box flexDirection="column" padding={1} width={terminalDimensions.columns} height={terminalDimensions.rows}>
            <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1} flexShrink={0}>
                <Text bold color="green">Gmail Sweep (v0.1.0)</Text>
            </Box>

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
                            emails={emails} 
                            focusedIndex={focusedIndex}
                            terminalWidth={terminalDimensions.columns}
                            terminalHeight={terminalDimensions.rows}
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
                        : ' [Arrows] Navigate  [Enter] View  [Esc] Exit '}
                </Text>
            </Box>
        </Box>
    );
}