import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';

export default function App() {
    // Placeholder for future navigation state
    // const [view, setView] = useState<'list' | 'detail'>('list');

    useInput((input, key) => {
        if (key.escape) {
            // Exit logic
        }
    });

    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
            <Text bold color="green">Gmail Sweep (v0.1.0)</Text>
            <Box marginTop={1}>
                <Text>Welcome to your Smart Inbox Organizer.</Text>
            </Box>
            <Box marginTop={1}>
                <Text color="gray">Initializing...</Text>
            </Box>
        </Box>
    );
}
