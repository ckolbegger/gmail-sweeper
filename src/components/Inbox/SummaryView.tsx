import React from 'react';
import { Box, Text, useInput } from 'ink';
import { EmailSummary } from '../../types';

interface SummaryViewProps {
    summary: EmailSummary | null;
    isSummarizing: boolean;
    error: string | null;
    isActive: boolean;
    onToggleView: () => void;
    onForceRegenerate?: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
    summary,
    isSummarizing,
    error,
    isActive,
    onToggleView,
    onForceRegenerate
}) => {
    useInput((input, key) => {
        if (!isActive) return;

        if (input === 's') {
            onToggleView();
            return;
        }

        if (input === 'S') {
            onForceRegenerate?.();
            return;
        }
    });

    return (
        <Box flexDirection="column" width="100%" height="100%">
            <Box borderStyle="classic" borderColor="magenta" paddingX={1} flexDirection="column" flexGrow={1}>
                <Box marginBottom={1}>
                    <Text bold color="magenta">AI Summary</Text>
                </Box>
                {isSummarizing ? (
                    <Text color="yellow">Generating summary...</Text>
                ) : error ? (
                    <Text color="red">Error generating summary: {error}</Text>
                ) : summary ? (
                    <Box flexDirection="column">
                        <Box marginBottom={1}>
                            <Text>{summary.description}</Text>
                        </Box>
                        {summary.actionItems.length > 0 ? (
                            <Box flexDirection="column">
                                <Text bold color="cyan">Action Items:</Text>
                                {summary.actionItems.map((item, idx) => (
                                    <Text key={idx}>• {item}</Text>
                                ))}
                            </Box>
                        ) : (
                            <Text color="gray">No action items detected.</Text>
                        )}
                    </Box>
                ) : (
                    <Text color="yellow">Loading...</Text>
                )}
            </Box>
            <Box marginTop={1} flexShrink={0}>
                <Text color="gray">Press 's' to view full email</Text>
            </Box>
        </Box>
    );
};
