import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export interface FilterInputProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  error?: Error;
}

export function FilterInput({
  onSubmit,
  isLoading = false,
  error,
}: FilterInputProps): React.ReactElement {
  const [input, setInput] = useState('');

  const handleSubmit = useCallback(
    (value: string) => {
      if (value.trim() && !isLoading) {
        onSubmit(value);
        setInput('');
      }
    },
    [onSubmit, isLoading]
  );

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text>Filter: </Text>
        {!isLoading ? (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Enter filter description..."
          />
        ) : (
          <Text>{input}</Text>
        )}
      </Box>

      {isLoading && (
        <Box marginBottom={1}>
          <Text dimColor>Evaluating...</Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error.message}</Text>
        </Box>
      )}
    </Box>
  );
}
