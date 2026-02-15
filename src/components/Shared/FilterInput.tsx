import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  initialValue?: string;
}

export const FilterInput: React.FC<Props> = ({ onSubmit, onCancel, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = (val: string) => {
    if (val.trim()) {
      onSubmit(val.trim());
    }
  };

  return (
    <Box flexDirection="row">
      <Text color="blue" bold>Smart Filter: </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};
