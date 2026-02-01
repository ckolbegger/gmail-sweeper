import React from 'react';
import { Box, Text } from 'ink';
import { Email } from '../../types';

interface EmailDetailProps {
    email: Email | null;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email }) => {
    if (!email) {
        return (
            <Box padding={1}>
                <Text color="gray">Select an email to view details</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor="gray">
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">{email.subject}</Text>
                <Text>From: <Text color="green">{email.from}</Text></Text>
                <Text>Date: <Text color="yellow">{email.date}</Text></Text>
            </Box>

            <Box borderStyle="classic" borderColor="gray" paddingX={1}>
                <Text>{email.body || email.snippet}</Text>
            </Box>
        </Box>
    );
};
