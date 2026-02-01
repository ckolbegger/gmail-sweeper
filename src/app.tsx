import React, { useState, useMemo } from 'react';
import { Text, Box, useInput } from 'ink';
import { useGmail } from './hooks/useGmail';
import { InboxList } from './components/Inbox/InboxList';
import { EmailDetail } from './components/Inbox/EmailDetail';
import { MockEmailService } from '../tests/mocks/mockEmailService';
import { Email } from './types';

export default function App() {
    const service = useMemo(() => new MockEmailService(), []);
    const { emails, loading, error } = useGmail(service);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    useInput((_: string, key) => {
        if (key.escape) {
            process.exit(0);
        }
    });

    return (
        <Box flexDirection="column" padding={1}>
            <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
                <Text bold color="green">Gmail Sweep (v0.1.0)</Text>
            </Box>

            {loading && (
                <Box padding={1}>
                    <Text color="yellow">Loading emails...</Text>
                </Box>
            )}

            {error && (
                <Box padding={1}>
                    <Text color="red">Error: {error}</Text>
                </Box>
            )}

            {!loading && !error && (
                <Box flexDirection="row">
                    <Box width="40%" flexDirection="column">
                        <InboxList emails={emails} onSelect={setSelectedEmail} />
                    </Box>
                    <Box width="60%" marginLeft={2}>
                        <EmailDetail email={selectedEmail} />
                    </Box>
                </Box>
            )}

            <Box marginTop={1} borderStyle="classic" borderColor="gray" paddingX={1}>
                <Text color="gray"> [Arrows] Navigate  [Enter] View  [Esc] Exit </Text>
            </Box>
        </Box>
    );
}

