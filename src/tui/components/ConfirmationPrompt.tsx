/**
 * T045: ConfirmationPrompt component - y/n confirmation for destructive actions
 */

import { Box, Text } from 'ink';

interface ConfirmationPromptProps {
  visible: boolean;
  emailSubject: string;
}

export function ConfirmationPrompt({ visible, emailSubject }: ConfirmationPromptProps) {
  if (!visible) {
    return null;
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1} marginTop={1}>
      <Box>
        <Text bold color="red">
          Delete Email?{' '}
        </Text>
      </Box>
      {emailSubject && (
        <Box marginBottom={1}>
          <Text color="dim">
            Subject: {emailSubject.slice(0, 50)}
            {emailSubject.length > 50 ? '...' : ''}
          </Text>
        </Box>
      )}
      <Box>
        <Text>Press </Text>
        <Text bold color="green">
          'y'
        </Text>
        <Text> to confirm or </Text>
        <Text bold color="yellow">
          'n'
        </Text>
        <Text>/</Text>
        <Text bold color="yellow">
          Escape
        </Text>
        <Text> to cancel</Text>
      </Box>
    </Box>
  );
}
