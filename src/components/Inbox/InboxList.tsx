import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { Email } from '../../types';

interface InboxListProps {
  emails: Email[];
  focusedIndex: number;
  terminalWidth: number;
  terminalHeight: number;
  dimmed?: boolean;
}

export const InboxList: React.FC<InboxListProps> = ({ 
    emails, 
    focusedIndex, 
    terminalWidth, 
    terminalHeight,
    dimmed = false
}) => {
  // Each email now takes 2 lines. 
  // We subtract headers/footers and then divide by 2 to get visible count.
  const visibleCount = useMemo(() => Math.max(2, Math.floor((terminalHeight - 10) / 2)), [terminalHeight]);
  const listWidth = Math.floor(terminalWidth * 0.4) - 2;

  if (!emails || emails.length === 0) {
    return (
      <Box padding={1} width={listWidth}>
        <Text color="gray">No emails found</Text>
      </Box>
    );
  }

  const start = Math.max(0, Math.min(focusedIndex - Math.floor(visibleCount / 2), Math.max(0, emails.length - visibleCount)));
  const visibleEmails = emails.slice(start, start + visibleCount);

  return (
    <Box flexDirection="column" width={listWidth} height="100%">
      {visibleEmails.map((email, index) => {
        const absoluteIndex = start + index;
        const isFocused = absoluteIndex === focusedIndex;
        const isUnread = email.isUnread;

        // Metadata line formatting: Sender (Left) | Date (Right)
        // Reserve ~16 chars for date
        const dateStr = email.date || '';
        const maxSenderWidth = Math.max(5, listWidth - dateStr.length - 5);
        const senderStr = (email.from || '').substring(0, maxSenderWidth);

        return (
          <Box 
            key={email.id} 
            flexDirection="column"
            backgroundColor={isFocused ? 'blue' : undefined}
            paddingX={1}
            marginBottom={1}
          >
            {/* Line 1: Subject */}
            <Box>
              <Text color={isFocused ? 'white' : 'blue'} dimColor={dimmed}>
                {isFocused ? '❯ ' : '  '}
              </Text>
              <Text 
                bold={isUnread} 
                color={isFocused ? 'white' : undefined} 
                dimColor={dimmed}
                wrap="truncate-end"
              >
                {email.subject || '(No Subject)'}
              </Text>
            </Box>

            {/* Line 2: Sender & Date */}
            <Box justifyContent="space-between">
              <Text 
                color={isFocused ? 'white' : 'gray'} 
                dimColor={dimmed || !isFocused}
                wrap="truncate-end"
              >
                {`  ${senderStr}`}
              </Text>
              <Text 
                color={isFocused ? 'white' : 'gray'} 
                dimColor={dimmed || !isFocused}
              >
                {dateStr}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
