/**
 * EmailPreview Component
 *
 * Displays a preview of the selected email in a side pane.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Email } from '../../core/contracts/types.js';

export interface EmailPreviewProps {
  /** Email to display */
  email: Email;
  /** Terminal height for calculating visible area */
  terminalHeight?: number;
  /** Scroll offset for body content */
  scrollOffset?: number;
  /** Width of the preview pane for text wrapping */
  width?: number;
}

/**
 * Format date for display
 */
function formatFullDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format email address for display
 */
function formatAddress(addr: { name?: string; email: string }): string {
  if (addr.name) {
    return `${addr.name} <${addr.email}>`;
  }
  return addr.email;
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
 * Wrap text to a maximum width, preserving newlines
 */
function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      // Handle case where a single word is longer than maxWidth
      if (word.length > maxWidth) {
        // Flush current line first
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
        // Split the long word into chunks
        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.slice(i, i + maxWidth));
        }
      } else if ((currentLine + word).length > maxWidth) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    // Add empty line for paragraph break (except for last paragraph)
    if (paragraph !== paragraphs[paragraphs.length - 1]) {
      lines.push('');
    }
  }

  return lines;
}

/**
 * EmailPreview TUI Component
 *
 * Shows email header info and body preview in a side pane.
 */
export function EmailPreview({
  email,
  terminalHeight = 24,
  scrollOffset = 0,
  width = 80,
}: EmailPreviewProps): React.ReactElement {
  // Calculate max visible body lines based on terminal height
  // Accounting for ALL elements with their margins:
  // paddingY(2) + subject(1) + from(2 with margin) + to(1) + date(2 with margin) + 
  // labels(2 with margin) + separator(2 with margin) + indicators(2) + hint(1) = 15 lines
  // Plus 2 more for safety margin
  const overheadLines = 17;
  const maxVisibleLines = Math.max(3, terminalHeight - overheadLines);

  const bodyContent = email.body.text || email.snippet || '(No content)';
  // Use width minus padding and safety margin for text wrapping
  // Must account for: left border (1) + left padding (2) + right padding (2) = 5 chars
  const wrapWidth = Math.max(30, width - 6);
  const wrappedBody = wrapText(bodyContent, wrapWidth);

  // Calculate visible body lines
  const totalBodyLines = wrappedBody.length;
  const hasMoreBelow = scrollOffset + maxVisibleLines < totalBodyLines;
  const hasMoreAbove = scrollOffset > 0;

  // Get visible lines
  const visibleLines = wrappedBody.slice(scrollOffset, scrollOffset + maxVisibleLines);

  return (
    React.createElement(Box, {
      flexDirection: 'column',
      paddingX: 2,
      paddingY: 1,
      height: terminalHeight,
      overflow: 'hidden',
    },
      // Subject (bold) - stripped of emoji for alignment
      React.createElement(Box, { flexShrink: 0 },
        React.createElement(Text, { bold: true, color: 'cyan' }, stripEmoji(email.subject))
      ),

      // From
      React.createElement(Box, { flexShrink: 0, marginTop: 1 },
        React.createElement(Text, { color: 'gray' }, 'From: '),
        React.createElement(Text, null, formatAddress(email.sender))
      ),

      // To
      email.recipients.length > 0 && React.createElement(Box, { flexShrink: 0 },
        React.createElement(Text, { color: 'gray' }, 'To: '),
        React.createElement(Text, null,
          email.recipients.map(formatAddress).join(', ')
        )
      ),

      // Date
      React.createElement(Box, { flexShrink: 0, marginTop: 1 },
        React.createElement(Text, { color: 'gray' }, 'Date: '),
        React.createElement(Text, null, formatFullDate(email.dateReceived))
      ),

      // Labels
      email.labels.length > 0 && React.createElement(Box, { flexShrink: 0, marginTop: 1 },
        React.createElement(Text, { color: 'gray' }, 'Labels: '),
        React.createElement(Text, null, email.labels.join(', '))
      ),

      // Separator line
      React.createElement(Box, {
        borderStyle: 'single',
        borderBottom: true,
        marginY: 1,
        flexShrink: 0,
        height: 1,
      }),

      // Scroll up indicator
      hasMoreAbove && React.createElement(Box, {
        justifyContent: 'center',
        flexShrink: 0,
        height: 1,
      },
        React.createElement(Text, { color: 'gray', dimColor: true },
          `↑ ${scrollOffset} more lines`
        )
      ),

      // Body content (fixed height to prevent overflow issues)
      React.createElement(Box, {
        flexDirection: 'column',
        height: maxVisibleLines,
        overflow: 'hidden',
        flexShrink: 0,
      },
        visibleLines.slice(0, maxVisibleLines).map((line, index) =>
          React.createElement(Box, { 
            key: `line-${scrollOffset + index}`, 
            height: 1,
            flexShrink: 0,
          },
            React.createElement(Text, null, line || ' ')
          )
        )
      ),

      // Scroll down indicator
      hasMoreBelow && React.createElement(Box, {
        justifyContent: 'center',
        flexShrink: 0,
        height: 1,
      },
        React.createElement(Text, { color: 'gray', dimColor: true },
          `↓ ${totalBodyLines - scrollOffset - maxVisibleLines} more lines`
        )
      ),

      // Scroll hint
      (hasMoreAbove || hasMoreBelow) && React.createElement(Box, {
        marginTop: 1,
        flexShrink: 0,
        height: 1,
      },
        React.createElement(Text, { color: 'gray', dimColor: true },
          '[ / ] to scroll preview'
        )
      )
    )
  );
}
