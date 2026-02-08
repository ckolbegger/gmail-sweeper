/**
 * EmailDetail Component
 *
 * Displays full email content in a detail pane with scrollable body.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Email } from '../../core/contracts/types.js';

export interface EmailDetailProps {
  /** Email to display */
  email: Email;
  /** Terminal height for calculating visible area */
  terminalHeight?: number;
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
 * Wrap text to a maximum width, preserving newlines
 */
function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxWidth) {
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
 * EmailDetail TUI Component
 * 
 * Layout uses flex to maximize body space:
 * - Header: fixed size (flexShrink: 0)
 * - Separator: fixed size (flexShrink: 0)
 * - Scroll indicators: fixed size when shown (flexShrink: 0, height: 1)
 * - Body: grows to fill remaining space (flexGrow: 1)
 * - Footer: fixed size (flexShrink: 0)
 */
export function EmailDetail({ email, terminalHeight = 24 }: EmailDetailProps): React.ReactElement {
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Calculate body lines based on terminal height minus minimal overhead
  // Overhead: borders (2) + header compact (~6-8) + footer (1) + indicators (2) = ~11-13
  const minOverhead = 12;
  const maxVisibleLines = Math.max(5, terminalHeight - minOverhead);
  
  const bodyContent = email.body.text || email.snippet || '(No content)';
  const wrappedBody = wrapText(bodyContent, 78);
  
  // Calculate visible body lines
  const totalBodyLines = wrappedBody.length;
  const hasMoreBelow = scrollOffset + maxVisibleLines < totalBodyLines;
  const hasMoreAbove = scrollOffset > 0;
  
  // Get visible lines
  const visibleLines = wrappedBody.slice(scrollOffset, scrollOffset + maxVisibleLines);

  // Handle keyboard scrolling
  useInput((input, key) => {
    if (key.downArrow || input === 'j') {
      if (scrollOffset + maxVisibleLines < totalBodyLines) {
        setScrollOffset(prev => prev + 1);
      }
    } else if (key.upArrow || input === 'k') {
      if (scrollOffset > 0) {
        setScrollOffset(prev => prev - 1);
      }
    } else if (key.pageDown || input === ' ') {
      setScrollOffset(prev => Math.min(prev + maxVisibleLines, totalBodyLines - maxVisibleLines));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(prev - maxVisibleLines, 0));
    } else if (input === 'g') {
      setScrollOffset(0);
    } else if (input === 'G') {
      setScrollOffset(Math.max(0, totalBodyLines - maxVisibleLines));
    }
  });

  return (
    React.createElement(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      height: terminalHeight,
    },
      // Header section - compact, no extra margins
      React.createElement(Box, { 
        flexDirection: 'column', 
        paddingX: 1,
        paddingTop: 1,
        paddingBottom: 0,
        flexShrink: 0,
        flexGrow: 0,
      },
        // Subject
        React.createElement(Text, { bold: true }, email.subject),

        // From
        React.createElement(Box, { marginTop: 1 },
          React.createElement(Text, { color: 'gray' }, 'From: '),
          React.createElement(Text, null, formatAddress(email.sender))
        ),

        // To (compact)
        email.recipients.length > 0 && React.createElement(Box, null,
          React.createElement(Text, { color: 'gray' }, 'To: '),
          React.createElement(Text, null,
            email.recipients.map(formatAddress).join(', ')
          )
        ),

        // CC (compact)
        email.cc.length > 0 && React.createElement(Box, null,
          React.createElement(Text, { color: 'gray' }, 'CC: '),
          React.createElement(Text, null,
            email.cc.map(formatAddress).join(', ')
          )
        ),

        // Date
        React.createElement(Box, { marginTop: 1 },
          React.createElement(Text, { color: 'gray', dimColor: true },
            formatFullDate(email.dateReceived)
          )
        ),

        // Labels
        email.labels.length > 0 && React.createElement(Box, { marginTop: 1 },
          React.createElement(Text, { color: 'gray' }, 'Labels: '),
          email.labels.map((label, index) =>
            React.createElement(Text, {
              key: label,
              color: 'cyan',
            },
              `${label}${index < email.labels.length - 1 ? ', ' : ''}`
            )
          )
        )
      ),

      // Separator - minimal height
      React.createElement(Box, {
        borderStyle: 'single',
        borderBottom: true,
        marginTop: 1,
        marginBottom: 0,
        padding: 0,
        height: 1,
        flexShrink: 0,
        flexGrow: 0,
      }),

      // Scroll up indicator
      hasMoreAbove && React.createElement(Box, {
        justifyContent: 'center',
        flexShrink: 0,
        height: 1,
        paddingX: 1,
      },
        React.createElement(Text, { color: 'gray', dimColor: true }, 
          `↑ ${scrollOffset} more lines`
        )
      ),

      // Body - fills remaining space
      React.createElement(Box, { 
        flexDirection: 'column',
        flexGrow: 1,
        flexShrink: 1,
        paddingX: 1,
        paddingY: 0,
        overflow: 'hidden',
      },
        visibleLines.slice(0, maxVisibleLines).map((line, index) =>
          React.createElement(Box, { key: scrollOffset + index, height: 1 },
            React.createElement(Text, null, line || ' ')
          )
        )
      ),

      // Scroll down indicator
      hasMoreBelow && React.createElement(Box, {
        justifyContent: 'center',
        flexShrink: 0,
        height: 1,
        paddingX: 1,
      },
        React.createElement(Text, { color: 'gray', dimColor: true }, 
          `↓ ${totalBodyLines - scrollOffset - maxVisibleLines} more lines`
        )
      ),

      // Footer hint - at bottom
      React.createElement(Box, {
        paddingX: 1,
        paddingBottom: 1,
        paddingTop: 0,
        flexShrink: 0,
        flexGrow: 0,
        height: 1,
      },
        React.createElement(Text, { color: 'gray' },
          '↑/↓ or j/k scroll | g/G top/bottom | PgUp/PgDn | Esc/q back'
        )
      )
    )
  );
}
