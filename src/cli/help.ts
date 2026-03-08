export interface HelpCommand {
  key: string;
  description: string;
}

export interface HelpSection {
  title: string;
  commands: HelpCommand[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Navigation',
    commands: [
      { key: '↑ / ↓', description: 'Move selection in email list' },
      { key: '[ / ]', description: 'Scroll email body in detail pane' },
      { key: '.', description: 'Refresh emails from Gmail' },
      { key: 'q', description: 'Quit application' },
      { key: '?', description: 'Toggle this help panel' },
    ],
  },
  {
    title: 'Sorting',
    commands: [
      { key: 'd', description: 'Sort by date' },
      { key: 'u', description: 'Sort by subject' },
      { key: 'b', description: 'Sort by label' },
      { key: 'g', description: 'Sort by category' },
    ],
  },
  {
    title: 'Filtering',
    commands: [
      { key: 'f', description: 'Filter by sender' },
      { key: 'l', description: 'Filter by label' },
      { key: 'c', description: 'Filter by category' },
      { key: 'a', description: 'AI-powered natural language filter' },
      { key: 'r', description: 'Toggle unread-only filter' },
      { key: 'x', description: 'Clear all filters' },
    ],
  },
  {
    title: 'Filter Input Mode',
    commands: [
      { key: 'Enter', description: 'Apply current filter text' },
      { key: 'Esc', description: 'Cancel filter text input' },
      { key: 'Backspace', description: 'Delete previous character' },
    ],
  },
  {
    title: 'Email Detail View',
    commands: [
      { key: 's', description: 'Toggle AI summary / full email' },
      { key: 'u / U', description: 'Cycle through URLs (next/previous)' },
      { key: 'c', description: 'Copy selected URL to clipboard' },
      { key: 'o', description: 'Open selected URL in browser' },
    ],
  },
  {
    title: 'Actions',
    commands: [
      { key: 'e', description: 'Archive selected email' },
      { key: '#', description: 'Delete selected email (move to trash)' },
    ],
  },
];
