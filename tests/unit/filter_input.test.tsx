import { describe, expect, it } from 'vitest';

import * as filterInputModule from '@/tui/filter_input.js';

interface FilterInputLinesArgs {
  status: 'idle' | 'input' | 'loading' | 'filtered' | 'error';
  draft: string;
  description: string;
  errorMessage?: string;
}

type BuildFilterInputLines = (args: FilterInputLinesArgs) => string[];

function getBuildFilterInputLines(): BuildFilterInputLines {
  const buildFilterInputLines = (
    filterInputModule as { buildFilterInputLines?: BuildFilterInputLines }
  ).buildFilterInputLines;

  if (!buildFilterInputLines) {
    throw new Error('buildFilterInputLines is not implemented');
  }

  return buildFilterInputLines;
}

describe('FilterInput', () => {
  it('should render an input prompt and keyboard hint while entering a filter', () => {
    const buildFilterInputLines = getBuildFilterInputLines();

    const lines = buildFilterInputLines({
      status: 'input',
      draft: 'receipts from online purchases',
      description: ''
    });

    expect(lines).toContain('Filter: receipts from online purchases');
    expect(lines).toContain('Enter to apply, Esc to clear');
  });

  it('should render loading status while AI evaluation is running', () => {
    const buildFilterInputLines = getBuildFilterInputLines();

    const lines = buildFilterInputLines({
      status: 'loading',
      draft: '',
      description: 'receipts'
    });

    expect(lines).toContain('Evaluating smart filter...');
    expect(lines).toContain('Active filter: receipts');
  });

  it('should render active filter and error messages when present', () => {
    const buildFilterInputLines = getBuildFilterInputLines();

    const lines = buildFilterInputLines({
      status: 'error',
      draft: '',
      description: 'receipts',
      errorMessage: 'AI_PROVIDER is not configured'
    });

    expect(lines).toContain('Active filter: receipts');
    expect(lines).toContain('(error) AI_PROVIDER is not configured');
  });
});
