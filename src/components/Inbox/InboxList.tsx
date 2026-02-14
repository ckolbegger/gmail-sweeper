import React from 'react';
import { Box, Text } from 'ink';
import { Email } from '../../types';

interface InboxListProps {
  emails: Email[];
  focusedIndex: number;
}

export const InboxList: React.FC<InboxListProps> = ({ emails, focusedIndex }) => {
  if (!emails || emails.length === 0) {
    return (
      <Box padding={1}>
        <Text color="gray">No emails found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {emails.map((email, index) => {
        const isFocused = index === focusedIndex;
        const isUnread = email.isUnread;

        return (
          <Box key={email.id} backgroundColor={isFocused ? 'blue' : undefined}>
            <Text color={isFocused ? 'white' : 'blue'}>
              {isFocused ? ' ❯ ' : '   '}
            </Text>
            <Text bold={isUnread} color={isFocused ? 'white' : (isUnread ? 'white' : 'gray')}>
              {(email.from || '').padEnd(25)}
            </Text>
            <Text color={isFocused ? 'white' : 'gray'}> │ </Text>
            <Text bold={isUnread} color={isFocused ? 'white' : undefined}>
              {(email.subject || '').length > 50 ? (email.subject || '').substring(0, 47) + '...' : (email.subject || '').padEnd(50)}
            </Text>
            <Text color={isFocused ? 'white' : 'gray'}> │ </Text>
            <Text color={isFocused ? 'white' : 'gray'}>{email.date || ''}</Text>
          </Box>
        );
      })}
    </Box>
  );
};