import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { Email } from '../../types';

interface InboxListProps {
  emails: Email[];
  focusedIndex: number;
  terminalWidth: number;
  terminalHeight: number;
}

export const InboxList: React.FC<InboxListProps> = ({ 
    emails, 
    focusedIndex, 
    terminalWidth, 
    terminalHeight 
}) => {
  const visibleCount = useMemo(() => Math.max(5, terminalHeight - 10), [terminalHeight]);
  const listWidth = useMemo(() => Math.floor(terminalWidth * 0.4) - 2, [terminalWidth]);

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

        return (
          <Box 
            key={email.id} 
            backgroundColor={isFocused ? 'blue' : undefined}
            height={1}
          >
            <Text color={isFocused ? 'white' : 'blue'}>
              {isFocused ? '❯' : ' '}
            </Text>
            <Text 
              bold={isUnread} 
              color={isFocused ? 'white' : (isUnread ? 'white' : 'gray')} 
              wrap="truncate"
            >
              {` ${(email.from || '').substring(0, 12).padEnd(12)}│`}
            </Text>
            <Text 
              bold={isUnread} 
              color={isFocused ? 'white' : undefined} 
              wrap="truncate"
            >
              {` ${(email.subject || '')}`}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};