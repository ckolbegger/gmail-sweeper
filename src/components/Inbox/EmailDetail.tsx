import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Email } from '../../types';

interface EmailDetailProps {
    email: Email | null;
    isActive?: boolean;
}

const WINDOW_HEIGHT = 15; // Number of lines to show in the body

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, isActive = false }) => {
    const [scrollOffset, setScrollOffset] = useState(0);

    // Reset scroll when email changes
    useEffect(() => {
        setScrollOffset(0);
    }, [email?.id]);

    const bodyText = email?.body || email?.snippet || '';
    const lines = bodyText.split('\n');
    const maxOffset = Math.max(0, lines.length - WINDOW_HEIGHT);

    useInput((_, key) => {
        if (!isActive) return;

        if (key.upArrow) {
            setScrollOffset(prev => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setScrollOffset(prev => Math.min(maxOffset, prev + 1));
        }
    });

    if (!email) {
        return (
            <Box padding={1}>
                <Text color="gray">Select an email to view details</Text>
            </Box>
        );
    }

    const visibleLines = lines.slice(scrollOffset, scrollOffset + WINDOW_HEIGHT);

    return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor={isActive ? 'blue' : 'gray'}>
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">{email.subject}</Text>
                <Text>From: <Text color="green">{email.from}</Text></Text>
                <Text>Date: <Text color="yellow">{email.date}</Text></Text>
            </Box>

            <Box borderStyle="classic" borderColor="gray" paddingX={1} flexDirection="column">
                {visibleLines.map((line, i) => (
                    <Text key={i} wrap="truncate-end">{line || ' '}</Text>
                ))}
                {lines.length > WINDOW_HEIGHT && (
                    <Box marginTop={0}>
                        <Text color="yellow">
                            -- [{scrollOffset + 1}-{Math.min(scrollOffset + WINDOW_HEIGHT, lines.length)} of {lines.length}] --
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};