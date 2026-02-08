/**
 * EmailList Component
 *
 * Displays a scrollable list of emails with keyboard navigation.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Email } from '../../core/contracts/types.js';

export interface AutoMaxVisible {
  /** Terminal height in rows */
  terminalHeight: number;
  /** Lines used by header (including borders) */
  headerLines: number;
  /** Lines used by footer (including borders) */
  footerLines: number;
  /** Additional padding to reserve (default: 2) */
  padding?: number;
}

export interface EmailListProps {
  /** Array of emails to display */
  emails: Email[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when email is selected */
  onSelect: (emailId: string) => void;
  /** Callback when selection changes */
  onSelectionChange?: (index: number) => void;
  /** Whether to show read/unread indicators */
  showReadStatus?: boolean;
  /** Maximum number of emails to show at once (overrides autoMaxVisible) */
  maxVisible?: number;
  /** Auto-calculate maxVisible from terminal dimensions */
  autoMaxVisible?: AutoMaxVisible;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Strip emoji and other wide characters that cause terminal alignment issues
 */
function stripEmoji(text: string): string {
  // Remove emoji and other non-ASCII characters that affect terminal width
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & map symbols
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and pictographs extended-a
    .trim();
}

/**
 * Truncate text to max length
 */
function truncate(text: string, maxLength: number): string {
  const cleanText = stripEmoji(text);
  if (cleanText.length <= maxLength) return cleanText;
  return cleanText.slice(0, maxLength - 3) + '...';
}

/**
 * Calculate the visible range of emails based on selection
 * 
 * Standard scrolling behavior:
 * - At top: show first maxVisible items, selection moves down
 * - When selection reaches bottom of viewport: scroll down by 1
 * - When selection reaches top of viewport: scroll up by 1
 * - At bottom: show last maxVisible items
 */
function calculateViewport(
  selectedIndex: number,
  totalEmails: number,
  maxVisible: number
): { start: number; end: number } {
  if (totalEmails <= maxVisible) {
    return { start: 0, end: totalEmails };
  }

  // Determine the viewport start based on selectedIndex
  // Keep selected item visible, scrolling only when necessary
  let start: number;
  
  if (selectedIndex < 0) {
    // Shouldn't happen, but handle gracefully
    start = 0;
  } else if (selectedIndex < maxVisible) {
    // At the top: start from 0
    start = 0;
  } else if (selectedIndex >= totalEmails - maxVisible) {
    // At the bottom: show last maxVisible items
    start = totalEmails - maxVisible;
  } else {
    // In the middle: keep selection visible with context above
    // The viewport scrolls when selection reaches the bottom
    start = selectedIndex - maxVisible + 1;
  }

  let end = Math.min(start + maxVisible, totalEmails);

  return { start, end };
}

/**
 * Calculate maxVisible from terminal dimensions
 */
function calculateMaxVisible(autoMaxVisible: AutoMaxVisible): number {
  const { terminalHeight, headerLines, footerLines, padding = 2 } = autoMaxVisible;
  // Each email takes 2 lines (subject line + sender/date line) plus spacing
  const emailLineHeight = 2;
  // Account for scroll indicators (2 lines when shown)
  const scrollIndicatorLines = 2;
  
  const availableHeight = terminalHeight - headerLines - footerLines - padding - scrollIndicatorLines;
  const maxVisible = Math.floor(availableHeight / emailLineHeight);
  
  // Ensure at least 3 emails are always visible
  return Math.max(3, maxVisible);
}

/**
 * EmailList TUI Component
 */
export function EmailList({
  emails,
  selectedIndex,
  onSelect: _onSelect,
  onSelectionChange: _onSelectionChange,
  showReadStatus = true,
  maxVisible: explicitMaxVisible,
  autoMaxVisible,
}: EmailListProps): React.ReactElement {

  // Calculate maxVisible
  let maxVisible: number;
  if (explicitMaxVisible !== undefined) {
    maxVisible = explicitMaxVisible;
  } else if (autoMaxVisible !== undefined) {
    maxVisible = calculateMaxVisible(autoMaxVisible);
  } else {
    // Default fallback
    maxVisible = 10;
  }

  if (emails.length === 0) {
    return (
      React.createElement(Box, { padding: 1 },
        React.createElement(Text, { color: 'gray' }, 'No emails')
      )
    );
  }

  // Calculate viewport
  const { start, end } = calculateViewport(selectedIndex, emails.length, maxVisible);
  const visibleEmails = emails.slice(start, end);
  const hasMoreAbove = start > 0;
  const hasMoreBelow = end < emails.length;

  return (
    React.createElement(Box, { flexDirection: 'column' },
      // Scroll up indicator
      hasMoreAbove && React.createElement(Box, {
        paddingX: 1,
        paddingY: 0,
        justifyContent: 'center',
      },
        React.createElement(Text, { color: 'gray', dimColor: true }, '↑ ' + start + ' more')
      ),

      // Email list (only visible ones)
      visibleEmails.map((email, index) => {
        const actualIndex = start + index;
        const isSelected = actualIndex === selectedIndex;
        const displayText = truncate(email.subject, 50);
        const senderName = email.sender.name || email.sender.email;
        const dateStr = formatDate(email.dateReceived);
        const indent = showReadStatus ? '      ' : '   ';
        
        return (
          React.createElement(Box, {
            key: email.id,
            flexDirection: 'column',
          },
            // Line 1: Subject row
            React.createElement(Box, { height: 1 },
              React.createElement(Text, {
                bold: isSelected || !email.isRead,
                color: isSelected ? 'cyan' : undefined,
              }, 
                // Selection indicator
                (isSelected ? '>' : ' ') + 
                // Read status
                (showReadStatus ? (email.isRead ? '   ' : ' ● ') : ' ') +
                // Subject
                displayText
              )
            ),
            
            // Line 2: Sender/date
            React.createElement(Box, { height: 1, marginTop: 0 },
              React.createElement(Text, {
                color: 'white',
              }, indent + truncate(senderName, 25) + ' · ' + dateStr)
            )
          )
        );
      }),

      // Scroll down indicator
      hasMoreBelow && React.createElement(Box, {
        paddingX: 1,
        paddingY: 0,
        justifyContent: 'center',
      },
        React.createElement(Text, { color: 'gray', dimColor: true }, '↓ ' + (emails.length - end) + ' more')
      )
    )
  );
}
