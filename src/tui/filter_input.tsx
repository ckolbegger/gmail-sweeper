import { Box, Text } from 'ink';
import { createElement } from 'react';

import type { FilterStatus } from '@/tui/use_smart_filter.js';

export interface FilterInputProps {
  status: FilterStatus;
  draft: string;
  description: string;
  errorMessage?: string;
}

export function buildFilterInputLines(props: FilterInputProps): string[] {
  const lines: string[] = [];
  const activeDescription = props.description.trim();

  if (props.status === 'input') {
    lines.push(`Filter: ${props.draft}`);
    lines.push('Enter to apply, Esc to clear');
    return lines;
  }

  if (activeDescription.length > 0) {
    lines.push(`Active filter: ${activeDescription}`);
  }

  if (props.status === 'loading') {
    lines.push('Evaluating smart filter...');
  }

  if (props.errorMessage && props.errorMessage.length > 0) {
    lines.push(`(error) ${props.errorMessage}`);
  }

  return lines;
}

export function FilterInput(props: FilterInputProps): unknown {
  const lines = buildFilterInputLines(props);
  if (lines.length === 0) {
    return null;
  }

  return createElement(
    Box,
    { flexDirection: 'column' },
    ...lines.map((line, index) => createElement(Text, { key: `${index}:${line}` }, line))
  );
}
