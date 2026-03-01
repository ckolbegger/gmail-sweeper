const DEFAULT_TERMINAL_WIDTH = 80;

export function getTerminalWidth(): number {
  if (process.stdout && typeof process.stdout.columns === 'number') {
    return process.stdout.columns;
  }
  return DEFAULT_TERMINAL_WIDTH;
}
