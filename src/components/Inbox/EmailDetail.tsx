import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Email } from '../../types';

interface EmailDetailProps {
    email: Email | null;
    isActive?: boolean;
}

const WINDOW_HEIGHT = 15;

// Simple word wrap function
function wrapText(text: string, width: number): string[] {
    const lines: string[] = [];
    const sourceLines = text.split('\n');

    for (const sourceLine of sourceLines) {
        if (sourceLine.length <= width) {
            lines.push(sourceLine);
            continue;
        }

        let currentLine = sourceLine;
        while (currentLine.length > width) {
            let wrapAt = currentLine.lastIndexOf(' ', width);
            if (wrapAt === -1) wrapAt = width;
            
            lines.push(currentLine.substring(0, wrapAt).trimEnd());
            currentLine = currentLine.substring(wrapAt).trimStart();
        }
        lines.push(currentLine);
    }

    return lines;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, isActive = false }) => {
    const [scrollOffset, setScrollOffset] = useState(0);
    const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 100);

    // Approximate available width for the body (60% of term - padding/borders)
    const availableWidth = useMemo(() => Math.floor(terminalWidth * 0.6) - 10, [terminalWidth]);

    // Update terminal width on resize if needed (simplified for CLI)
    useEffect(() => {
        const onResize = () => setTerminalWidth(process.stdout.columns);
        process.stdout.on('resize', onResize);
        return () => {
            process.stdout.off('resize', onResize);
        };
    }, []);

    const allLines = useMemo(() => {
        const bodyText = email?.body || email?.snippet || '';
        return wrapText(bodyText, availableWidth);
    }, [email, availableWidth]);

    const maxOffset = Math.max(0, allLines.length - WINDOW_HEIGHT);

    // Reset scroll when email changes
    useEffect(() => {
        setScrollOffset(0);
    }, [email?.id]);

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

    const visibleLines = allLines.slice(scrollOffset, scrollOffset + WINDOW_HEIGHT);

    return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor={isActive ? 'blue' : 'gray'}>
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color="cyan">{email.subject}</Text>
                <Text>From: <Text color="green">{email.from}</Text></Text>
                <Text>Date: <Text color="yellow">{email.date}</Text></Text>
            </Box>

            <Box borderStyle="classic" borderColor="gray" paddingX={1} flexDirection="column">
                {visibleLines.map((line, i) => (
                    <Text key={i}>{line || ' '}</Text>
                ))}
                {allLines.length > WINDOW_HEIGHT && (
                    <Box marginTop={0}>
                        <Text color="yellow">
                            -- [{scrollOffset + 1}-{Math.min(scrollOffset + WINDOW_HEIGHT, allLines.length)} of {allLines.length}] --
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
