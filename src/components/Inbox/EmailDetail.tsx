import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Email } from '../../types';

interface EmailDetailProps {
    email: Email | null;
    isActive?: boolean;
    terminalWidth: number;
    terminalHeight: number;
}

function wrapText(text: string, width: number): string[] {
    const lines: string[] = [];
    const sourceLines = text.split('\n');

    for (const sourceLine of sourceLines) {
        if (!sourceLine || sourceLine.length <= width) {
            lines.push(sourceLine || '');
            continue;
        }

        let currentLine = sourceLine;
        while (currentLine.length > width) {
            let wrapAt = currentLine.lastIndexOf(' ', width);
            if (wrapAt === -1 || wrapAt === 0) wrapAt = width;
            
            lines.push(currentLine.substring(0, wrapAt).trimEnd());
            currentLine = currentLine.substring(wrapAt).trimStart();
        }
        if (currentLine) lines.push(currentLine);
    }

    return lines;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ 
    email, 
    isActive = false, 
    terminalWidth, 
    terminalHeight 
}) => {
    const [scrollOffset, setScrollOffset] = useState(0);

    // Dynamic height calculation:
    // Terminal height - (App Header:3 + App Footer:3 + Detail Header:4 + Outer Padding:2 + Detail Border:2)
    const windowHeight = useMemo(() => Math.max(5, terminalHeight - 14), [terminalHeight]);

    // Approximate available width for the body (60% of term - padding/borders)
    const availableWidth = useMemo(() => Math.max(20, Math.floor(terminalWidth * 0.6) - 8), [terminalWidth]);

    const allLines = useMemo(() => {
        const bodyText = email?.body || email?.snippet || '';
        return wrapText(bodyText, availableWidth);
    }, [email, availableWidth]);

    const maxOffset = Math.max(0, allLines.length - windowHeight);

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
            <Box padding={1} width="100%">
                <Text color="gray">Select an email to view details</Text>
            </Box>
        );
    }

    const visibleLines = allLines.slice(scrollOffset, scrollOffset + windowHeight);

    return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor={isActive ? 'blue' : 'gray'} width="100%" height="100%">
            <Box flexDirection="column" marginBottom={1} flexShrink={0}>
                <Text bold color="cyan" wrap="truncate-end">{email.subject}</Text>
                <Text wrap="truncate-end">From: <Text color="green">{email.from}</Text></Text>
                <Text wrap="truncate-end">Date: <Text color="yellow">{email.date}</Text></Text>
            </Box>

            <Box borderStyle="classic" borderColor="gray" paddingX={1} flexDirection="column" flexGrow={1}>
                {visibleLines.map((line, i) => (
                    <Text key={i} wrap="truncate-end">{line || ' '}</Text>
                ))}
                {allLines.length > windowHeight && (
                    <Box marginTop={0}>
                        <Text color="yellow">
                            -- [{scrollOffset + 1}-{Math.min(scrollOffset + windowHeight, allLines.length)} of {allLines.length}] --
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
