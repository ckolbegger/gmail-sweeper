/**
 * FilterInput TUI Component
 *
 * Text input component for entering natural language filter descriptions.
 * FR-004: Shows loading indicator during evaluation
 * FR-013: Rejects empty description (handled by parent)
 */

import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState, useEffect } from 'react';

export interface FilterInputProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  error?: string | null;
  /** Progress info: current batch being processed */
  progress?: { current: number; total: number } | null;
}

/**
 * Spinner frames for loading animation
 */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * FilterInput component for natural language filter entry.
 *
 * Features:
 * - Text input for filter description
 * - Loading spinner during evaluation (FR-004)
 * - Error display in red
 * - Trimmed input on submit
 */
export function FilterInput({
  onSubmit,
  isLoading = false,
  error = null,
  progress = null,
}: FilterInputProps): JSX.Element {
  const [value, setValue] = useState('');
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  // Animate spinner during loading
  useEffect(() => {
    if (!isLoading) {
      setSpinnerFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Handle submission
  const handleSubmit = (submittedValue: string) => {
    if (isLoading) {
      return; // Don't submit while loading
    }
    const trimmed = submittedValue.trim();
    onSubmit(trimmed);
  };

  // Show loading state
  if (isLoading) {
    const progressText = progress
      ? `Evaluating batch ${progress.current}/${progress.total}...`
      : 'Evaluating filter...';
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color="cyan">{SPINNER_FRAMES[spinnerFrame]} </Text>
          <Text dimColor>{progressText}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Escape to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color="red">✗ </Text>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Escape to clear</Text>
        </Box>
      </Box>
    );
  }

  // Show input prompt
  return (
    <Box paddingX={1}>
      <Text bold color="cyan">
        Filter:{' '}
      </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder="Enter filter description (e.g., financial offers)"
        showCursor={true}
      />
    </Box>
  );
}
