/**
 * EmailDetail Component
 *
 * Displays full email content in a detail pane with scrollable body.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Email } from '../../core/contracts/types.js';
import { formatEmailBodyWithLinks, type LinkSegment } from '../utils/email-body-formatter.js';

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
 * Map link positions from formatted text to wrapped line coordinates
 * 
 * Takes links with absolute positions in the formatted (unwrapped) text and maps
 * them to their positions within each wrapped line. Links that span multiple
 * wrapped lines will appear in the result for each line they touch.
 * 
 * @param links - Array of link segments with absolute positions in formatted text
 * @param wrappedLines - Array of wrapped lines (output from wrapText)

 * @returns Map from line index to array of links on that line (with adjusted positions)
 */
export function adjustLinksForWrapping(
  links: LinkSegment[],
  wrappedLines: string[]
): Map<number, LinkSegment[]> {
  const result = new Map<number, LinkSegment[]>();

  // Return empty map if no links
  if (links.length === 0) {
    return result;
  }

  // Build cumulative position map: for each position in the original text,
  // determine which wrapped line it falls on and at what position within that line
  const lineBoundaries: Array<{ start: number; end: number }> = [];
  let currentPosition = 0;

  for (const line of wrappedLines) {
    const lineLength = line.length;
    lineBoundaries.push({
      start: currentPosition,
      end: currentPosition + lineLength
    });
    currentPosition += lineLength;
  }

  // For each link, determine which wrapped lines it appears on
  for (const link of links) {
    const linkStart = link.start;
    const linkEnd = link.end;

    // Find all wrapped lines that this link intersects with
    for (let lineIndex = 0; lineIndex < lineBoundaries.length; lineIndex++) {
      const boundary = lineBoundaries[lineIndex];
      const lineText = wrappedLines[lineIndex];

      // Check if link overlaps with this line
      // Link overlaps if: linkStart < lineEnd AND linkEnd > lineStart
      if (linkStart < boundary.end && linkEnd > boundary.start) {
        // Calculate adjusted positions relative to this line
        const adjustedStart = Math.max(0, linkStart - boundary.start);
        const adjustedEnd = Math.min(lineText.length, linkEnd - boundary.start);

        // Create adjusted link segment
        const adjustedLink: LinkSegment = {
          start: adjustedStart,
          end: adjustedEnd,
          text: lineText.slice(adjustedStart, adjustedEnd),
          url: link.url
        };

        // Add to result map
        if (!result.has(lineIndex)) {
          result.set(lineIndex, []);
        }
        result.get(lineIndex)!.push(adjustedLink);
      }
    }
  }

  return result;
}

/**
 * Render a line with colored link segments
 * 
 * Splits the line into text and link segments, rendering links in cyan color.
 * Returns a React element containing Text components for each segment.
 */
export function renderLineWithLinks(line: string, links: LinkSegment[]): React.ReactElement {
  if (links.length === 0) {
    // No links on this line - render as plain text
    return React.createElement(Text, null, line || ' ');
  }

  // Sort links by start position to process them in order
  const sortedLinks = [...links].sort((a, b) => a.start - b.start);
  
  const children: React.ReactElement[] = [];
  let currentPosition = 0;

  for (const link of sortedLinks) {
    // Add text before this link (if any)
    if (link.start > currentPosition) {
      const textBefore = line.slice(currentPosition, link.start);
      children.push(React.createElement(Text, { key: `text-${currentPosition}` }, textBefore));
    }
    
    // Add the link text with cyan color
    children.push(
      React.createElement(
        Text, 
        { key: `link-${link.start}`, color: 'cyan' }, 
        link.text
      )
    );
    
    currentPosition = link.end;
  }

  // Add any remaining text after the last link
  if (currentPosition < line.length) {
    const textAfter = line.slice(currentPosition);
    children.push(React.createElement(Text, { key: `text-${currentPosition}` }, textAfter));
  }

  // Wrap all children in a fragment-like container using span
  return React.createElement(Text, null, ...children);
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
  const maxContentWidth = 78; // Can use terminal width if available
  const { text: formattedBody, links } = formatEmailBodyWithLinks(bodyContent, {
    maxWidth: maxContentWidth,
    htmlBody: email.body.html,
  });
  const wrappedBody = wrapText(formattedBody, maxContentWidth);
  const lineLinksMap = adjustLinksForWrapping(links, wrappedBody);
  
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
        visibleLines.slice(0, maxVisibleLines).map((line, index) => {
          const lineIndex = scrollOffset + index;
          const lineLinks = lineLinksMap.get(lineIndex) || [];
          return React.createElement(Box, { key: lineIndex, height: 1 },
            renderLineWithLinks(line, lineLinks)
          );
        })
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
