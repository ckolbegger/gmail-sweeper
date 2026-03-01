/**
 * T047: EmailPreview component - displays full email content.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Email } from '../../core/models/index.js';
import {
  collapseBlankLines,
  convertHtmlToText,
  getTerminalWidth,
  parseUrls,
} from '../../core/rendering/index.js';
import { UrlLink } from './UrlLink.js';

interface EmailPreviewProps {
  email: Email | undefined;
  maxHeight: number;
  scrollOffset?: number;
  terminalWidth?: number; // Used for URL truncation in Phase 4
}

/**
 * Format recipient list
 */
function formatRecipients(recipients: Array<{ email: string; name?: string }>): string {
  return recipients.map((r) => r.name || r.email).join(', ');
}

export function EmailPreview({
  email,
  maxHeight = 20,
  scrollOffset = 0,
  terminalWidth: providedWidth,
}: EmailPreviewProps) {
  const terminalWidth = providedWidth ?? getTerminalWidth();

  if (!email) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No email selected.</Text>
      </Box>
    );
  }

  // Header takes ~4 lines (subject, from, to, separator)
  const headerLines = 4;
  // 1 line for scroll indicator at bottom
  const bodyMaxLines = Math.max(1, maxHeight - headerLines - 1);

  const rawBody = email.bodyText || (email.bodyHtml ? convertHtmlToText(email.bodyHtml) : '');
  const processedBody = collapseBlankLines(rawBody);
  const allBodyLines = processedBody.split('\n');

  // Parse URLs from body
  const { urls: urlMap } = parseUrls(allBodyLines);

  const totalLines = allBodyLines.length;
  const clampedOffset = Math.min(scrollOffset, Math.max(0, totalLines - bodyMaxLines));
  const displayedLines = allBodyLines.slice(clampedOffset, clampedOffset + bodyMaxLines);
  const hasMore = clampedOffset + bodyMaxLines < totalLines;
  const hasScrolledDown = clampedOffset > 0;

  // Render a line with URLs replaced as clickable links
  const renderLineWithUrls = (line: string, lineIdx: number) => {
    const urls = urlMap.get(lineIdx);
    if (!urls || urls.length === 0) {
      return <Text key={lineIdx}>{line}</Text>;
    }

    // Build line with URL links
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    // Sort URLs by start position
    const sortedUrls = [...urls].sort((a, b) => a.startIndex - b.startIndex);

    for (const urlInfo of sortedUrls) {
      // Add text before URL
      if (urlInfo.startIndex > lastEnd) {
        parts.push(<Text key={`t-${lastEnd}`}>{line.slice(lastEnd, urlInfo.startIndex)}</Text>);
      }
      // Add URL as link
      parts.push(
        <UrlLink key={`u-${urlInfo.startIndex}`} urlInfo={urlInfo} terminalWidth={terminalWidth} />
      );
      lastEnd = urlInfo.endIndex;
    }

    // Add remaining text after last URL
    if (lastEnd < line.length) {
      parts.push(<Text key={`t-${lastEnd}`}>{line.slice(lastEnd)}</Text>);
    }

    return <Text key={lineIdx}>{parts}</Text>;
  };

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Text bold wrap="truncate">
        {email.subject}
      </Text>
      <Text wrap="truncate">From: {email.sender.name || email.sender.email}</Text>
      <Text wrap="truncate">To: {formatRecipients(email.recipients)}</Text>
      {email.hasAttachments && <Text>📎 Has attachments</Text>}
      <Text dimColor>{'─'.repeat(40)}</Text>

      {/* Body */}
      {displayedLines.length > 0 ? (
        displayedLines.map((line, idx) => {
          const actualLineIdx = clampedOffset + idx;
          return renderLineWithUrls(line, actualLineIdx);
        })
      ) : (
        <Text dimColor>(No body)</Text>
      )}

      {/* Scroll indicator */}
      <Text dimColor>
        {hasScrolledDown ? '↑ ' : '  '}
        Lines {clampedOffset + 1}-{Math.min(clampedOffset + bodyMaxLines, totalLines)} of{' '}
        {totalLines}
        {hasMore ? ' ↓' : ''}
        {hasMore || hasScrolledDown ? '  [/] scroll' : ''}
      </Text>
    </Box>
  );
}
