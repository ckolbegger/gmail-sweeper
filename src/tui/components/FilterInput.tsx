/**
 * T029/T037: FilterInput component - text input for filter description
 */

import { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { FilterProgress } from '../hooks/useSmartFilter.js';

export type FilterInputState = 'idle' | 'input' | 'loading' | 'filtered' | 'error';

interface FilterInputProps {
  state: FilterInputState;
  errorMessage?: string | null;
  onSubmit: (description: string) => void;
  onCancel: () => void;
  progress?: FilterProgress | null;
}

export function FilterInput({ state, errorMessage, onSubmit, onCancel, progress }: FilterInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSubmit(value);
    }
  }, [value, onSubmit]);

  if (state === 'idle' || state === 'filtered') {
    return null;
  }

  const isLoading = state === 'loading';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold cyan>Filter Emails: </Text>
        {isLoading && <Text>({progress?.evaluatedCount || 0}/{progress?.totalCount || 0} emails)</Text>}
      </Box>
      
      {isLoading ? (
        <Box flexDirection="column">
          <Box>
            <Text>Evaluating: </Text>
            <Text bold>{value}</Text>
          </Box>
          {progress && progress.totalBatches > 0 && (
            <Box marginTop={1}>
              <Text dimColor>Batch {progress.currentBatch}/{progress.totalBatches}</Text>
            </Box>
          )}
        </Box>
      ) : (
        <Box>
          <Text>Enter description: </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder="e.g., invitation emails, newsletters, receipts..."
          />
        </Box>
      )}
      
      {errorMessage && (
        <Box marginTop={1}>
          <Text red>{errorMessage}</Text>
        </Box>
      )}
      
      {state === 'input' && (
        <Box marginTop={1}>
          <Text dimColor>Press Enter to filter - Escape to cancel</Text>
        </Box>
      )}
    </Box>
  );
}
