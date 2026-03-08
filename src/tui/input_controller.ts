export type TuiCommand =
  | 'up'
  | 'down'
  | 'open'
  | 'summary'
  | 'back'
  | 'archive'
  | 'delete'
  | 'quit'
  | 'filter'
  | 'escape'
  | 'noop';

export interface TuiKeyInfo {
  upArrow?: boolean;
  downArrow?: boolean;
  return?: boolean;
  backspace?: boolean;
  escape?: boolean;
  ctrl?: boolean;
}

export function parseCommandToken(token: string): TuiCommand {
  const command = token.trim().toLowerCase();
  if (['up', 'k'].includes(command)) return 'up';
  if (['down', 'j'].includes(command)) return 'down';
  if (['open', 'enter', 'o'].includes(command)) return 'open';
  if (['summary', 's'].includes(command)) return 'summary';
  if (['back', 'b'].includes(command)) return 'back';
  if (['archive', 'e'].includes(command)) return 'archive';
  if (['delete', '#'].includes(command)) return 'delete';
  if (['filter', 'f'].includes(command)) return 'filter';
  if (['escape', 'esc'].includes(command)) return 'escape';
  if (['quit', 'q', 'exit'].includes(command)) return 'quit';
  return 'noop';
}

export function mapInputToCommand(input: string, key: TuiKeyInfo): TuiCommand {
  if (key.ctrl && (input.length === 0 || input.toLowerCase() === 'c')) return 'quit';
  if (key.upArrow) return 'up';
  if (key.downArrow) return 'down';
  if (key.return) return 'open';
  if (key.backspace) return 'back';
  if (key.escape) return 'escape';
  return parseCommandToken(input);
}
