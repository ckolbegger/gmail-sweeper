import { describe, expect, it } from 'vitest';

import { mapInputToCommand, parseCommandToken } from '@/tui/input_controller.js';

describe('ink input controller', () => {
  it('should map j/k and arrow keys to selection movement actions', () => {
    expect(parseCommandToken('j')).toBe('down');
    expect(parseCommandToken('k')).toBe('up');
    expect(mapInputToCommand('', { downArrow: true })).toBe('down');
    expect(mapInputToCommand('', { upArrow: true })).toBe('up');
  });

  it('should map enter to open detail and b/backspace to close detail', () => {
    expect(mapInputToCommand('', { return: true })).toBe('open');
    expect(parseCommandToken('b')).toBe('back');
    expect(mapInputToCommand('', { backspace: true })).toBe('back');
  });

  it('should map q and ctrl+c to cleanly exit the ink session', () => {
    expect(parseCommandToken('q')).toBe('quit');
    expect(mapInputToCommand('', { ctrl: true })).toBe('quit');
  });
});
