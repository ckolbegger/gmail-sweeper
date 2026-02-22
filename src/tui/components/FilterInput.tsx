/**
 * T022: FilterInput component for smart email filtering.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';

interface FilterProgress {
  evaluatedCount: number;
  totalCount: number;
  percent: number;
}

export interface FilterInputProps {
  isLoading: boolean;
  error: string | null;
  filterDescription?: string;
  progress?: FilterProgress | null;
  onSubmit: (description: string) => void;
  onCancel: () => void;
}

export function FilterInput({
  isLoading,
  error,
  progress,
  onSubmit,
  onCancel,
}: FilterInputProps): React.ReactElement {
  const [value, setValue] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  if (isLoading) {
    const progressText = progress
      ? ` ${progress.evaluatedCount}/${progress.totalCount} — ${progress.percent}% complete`
      : ' Evaluating...';
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text>{progressText}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red" wrap="truncate-end">{error}</Text>
        <Text dimColor>Press Esc to dismiss, f to try again</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text>Filter: </Text>
      <TextInput value={value} onChange={setValue} onSubmit={onSubmit} />
    </Box>
  );
}
