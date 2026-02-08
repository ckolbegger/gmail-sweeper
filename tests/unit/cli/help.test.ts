import { describe, expect, it } from 'vitest';
import { HELP_SECTIONS } from '../../../src/cli/help.js';

describe('HELP_SECTIONS', () => {
  it('groups commands by purpose', () => {
    const titles = HELP_SECTIONS.map((section) => section.title);

    expect(titles).toContain('Navigation');
    expect(titles).toContain('Sorting');
    expect(titles).toContain('Filtering');
  });

  it('includes help toggle command', () => {
    const allKeys = HELP_SECTIONS.flatMap((section) =>
      section.commands.map((command) => command.key)
    );
    expect(allKeys).toContain('?');
  });
});
