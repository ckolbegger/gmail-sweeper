/**
 * Email Detail TUI Component
 *
 * Displays full email content including headers and body.
 */

import { Box, Text } from 'ink';
import type { Email } from '../../core/models/email.js';

export interface EmailDetailProps {
  email: Email | null;
}

export function EmailDetail({ email }: EmailDetailProps) {
  // Handle null email state
  if (!email) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>Select an email to view its details</Text>
      </Box>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEmailAddress = (name: string | undefined, emailAddress: string) => {
    if (name) {
      return `${name} <${emailAddress}>`;
    }
    return emailAddress;
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {/* Subject */}
      <Box marginBottom={1}>
        <Text bold>{email.subject}</Text>
      </Box>

      {/* From */}
      <Box marginBottom={1}>
        <Text color="blue">From: </Text>
        <Text>{formatEmailAddress(email.sender.name, email.sender.email)}</Text>
      </Box>

      {/* To */}
      {email.recipients.length > 0 && (
        <Box marginBottom={1}>
          <Text color="blue">To: </Text>
          <Text>
            {email.recipients.map(r => formatEmailAddress(r.name, r.email)).join(', ')}
          </Text>
        </Box>
      )}

      {/* CC */}
      {email.cc.length > 0 && (
        <Box marginBottom={1}>
          <Text color="blue">Cc: </Text>
          <Text>
            {email.cc.map(r => formatEmailAddress(r.name, r.email)).join(', ')}
          </Text>
        </Box>
      )}

      {/* Date */}
      <Box marginBottom={1}>
        <Text color="blue">Date: </Text>
        <Text>{formatDate(email.dateReceived)}</Text>
      </Box>

      {/* Labels */}
      {email.labels.length > 0 && (
        <Box marginBottom={1}>
          <Text color="blue">Labels: </Text>
          <Text>{email.labels.join(', ')}</Text>
        </Box>
      )}

      {/* Separator */}
      <Box marginBottom={1} borderStyle="single" borderBottom>
        <Text> </Text>
      </Box>

      {/* Body */}
      <Box flexDirection="column" flexGrow={1}>
        {email.body.text ? (
          <Text>{email.body.text}</Text>
        ) : (
          <Text dimColor>No content available</Text>
        )}
      </Box>
    </Box>
  );
}
