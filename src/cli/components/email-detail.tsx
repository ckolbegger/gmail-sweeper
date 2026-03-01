/**
 * Email Detail TUI Component
 *
 * Displays full email content including headers and body.
 */

import { Box, Text } from 'ink';
import { useState } from 'react';
import { useKeyboard } from '../hooks/use-keyboard.js';
import type { Email } from '../../core/models/email.js';
import {
  collapseBlankLines,
  process as processBody,
} from '../../core/services/email-content-processor.js';
import { ClipboardService } from '../../core/services/clipboard-service.js';
import { BrowserService } from '../../core/services/browser-service.js';

export interface EmailDetailProps {
  email: Email | null;
  maxBodyLines?: number;
  maxBodyColumns?: number;
  scrollOffset?: number;
}

export interface BodyViewport {
  lines: string[];
  totalLines: number;
  startLine: number;
  endLine: number;
  canScrollUp: boolean;
  canScrollDown: boolean;
}

export function buildBodyViewport(
  body: string,
  maxLines: number,
  scrollOffset: number,
  maxColumns: number
): BodyViewport {
  const safeMaxLines = Math.max(1, maxLines);
  const safeMaxColumns = Math.max(1, maxColumns - 3);
  const sanitizedBody = body
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  // Collapse excessive blank lines (3+ to 2)
  const collapsedBody = collapseBlankLines(sanitizedBody);

  const rawLines = collapsedBody.split('\n');

  const wrappedLines: string[] = [];

  const charDisplayWidth = (char: string): number => {
    const codePoint = char.codePointAt(0) ?? 0;
    if (/\p{Extended_Pictographic}/u.test(char)) {
      return 2;
    }

    return codePoint > 0xffff ? 2 : 1;
  };

  const wrapByDisplayWidth = (line: string, maxWidth: number): string[] => {
    if (line.length === 0) {
      return [''];
    }

    const chunks: string[] = [];
    let current = '';
    let currentWidth = 0;

    for (const char of line) {
      const width = charDisplayWidth(char);
      if (currentWidth + width > maxWidth && current.length > 0) {
        chunks.push(current);
        current = char;
        currentWidth = width;
      } else {
        current += char;
        currentWidth += width;
      }
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  };

  for (const line of rawLines) {
    wrappedLines.push(...wrapByDisplayWidth(line, safeMaxColumns));
  }

  const totalLines = wrappedLines.length;
  const maxOffset = Math.max(0, totalLines - safeMaxLines);
  const clampedOffset = Math.max(0, Math.min(scrollOffset, maxOffset));
  const visibleLines = wrappedLines.slice(clampedOffset, clampedOffset + safeMaxLines);

  while (visibleLines.length < safeMaxLines) {
    visibleLines.push('');
  }

  return {
    lines: visibleLines,
    totalLines,
    startLine: totalLines === 0 ? 0 : clampedOffset + 1,
    endLine: Math.min(clampedOffset + safeMaxLines, totalLines),
    canScrollUp: clampedOffset > 0,
    canScrollDown: clampedOffset + safeMaxLines < totalLines,
  };
}

function truncateToDisplayWidth(value: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }

  const charDisplayWidth = (char: string): number => {
    const codePoint = char.codePointAt(0) ?? 0;
    if (/\p{Extended_Pictographic}/u.test(char)) {
      return 2;
    }

    return codePoint > 0xffff ? 2 : 1;
  };

  let width = 0;
  let result = '';
  for (const char of value) {
    const charWidth = charDisplayWidth(char);
    if (width + charWidth > maxWidth) {
      break;
    }
    result += char;
    width += charWidth;
  }

  return result;
}

function padToDisplayWidth(value: string, targetWidth: number): string {
  const safeTarget = Math.max(0, targetWidth);
  let width = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    const charWidth = /\p{Extended_Pictographic}/u.test(char) || codePoint > 0xffff ? 2 : 1;
    width += charWidth;
  }

  if (width >= safeTarget) {
    return value;
  }

  return `${value}${' '.repeat(safeTarget - width)}`;
}

export function EmailDetail({
  email,
  maxBodyLines = 16,
  maxBodyColumns = 40,
  scrollOffset = 0,
}: EmailDetailProps) {
  // URL cycling state - must be called before any conditional returns
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [statusMessage, setStatusMessage] = useState<string>('No URLs in this email');

  // URL cycling handlers - must be defined before useKeyboard
  const handleNextUrl = () => {
    if (urls.length === 0) {
      setStatusMessage('No URLs in this email');
      return;
    }
    const nextIndex = (selectedIndex + 1) % urls.length;
    setSelectedIndex(nextIndex);
    setStatusMessage(urls[nextIndex]!);
  };

  const handlePrevUrl = () => {
    if (urls.length === 0) {
      setStatusMessage('No URLs in this email');
      return;
    }
    const prevIndex = selectedIndex <= 0 ? urls.length - 1 : selectedIndex - 1;
    setSelectedIndex(prevIndex);
    setStatusMessage(urls[prevIndex]!);
  };

  const handleCopyUrl = async () => {
    if (urls.length === 0 || selectedIndex < 0) return;
    const success = await ClipboardService.write(urls[selectedIndex]!);
    setStatusMessage(success ? `Copied: ${urls[selectedIndex]}` : 'Failed to copy');
  };

  const handleOpenUrl = async () => {
    if (urls.length === 0 || selectedIndex < 0) return;
    const success = await BrowserService.open(urls[selectedIndex]!);
    setStatusMessage(success ? `Opened: ${urls[selectedIndex]}` : 'Failed to open');
  };

  // Register keyboard shortcuts - must be called before early return
  useKeyboard({
    shortcuts: [
      { key: 'u', handler: handleNextUrl, description: 'Next URL' },
      { key: 'U', handler: handlePrevUrl, description: 'Previous URL' },
      {
        key: 'c',
        handler: () => {
          void handleCopyUrl();
        },
        description: 'Copy URL',
      },
      {
        key: 'o',
        handler: () => {
          void handleOpenUrl();
        },
        description: 'Open URL',
      },
    ],
  });

  // Handle null email state
  if (!email) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>Select an email to view its details</Text>
      </Box>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEmailAddress = (name: string | undefined, emailAddress: string) => {
    if (name) {
      return `${name} <${emailAddress}>`;
    }
    return emailAddress;
  };

  const summarizeAddresses = (addresses: Email['recipients']): string => {
    if (addresses.length === 0) {
      return '';
    }

    const shown = addresses
      .slice(0, 2)
      .map((address) => formatEmailAddress(address.name, address.email));
    const remaining = addresses.length - shown.length;
    return remaining > 0 ? `${shown.join(', ')} (+${remaining} more)` : shown.join(', ');
  };

  const truncateLine = (value: string, width: number): string => {
    if (value.length <= width) {
      return value;
    }

    return `${value.slice(0, Math.max(1, width - 1))}…`;
  };

  const bodyText = email.body.text || '';

  // Process body: collapse blank lines and detect/truncate URLs
  const maxUrlWidth = Math.floor(maxBodyColumns / 2);
  const processedBody = processBody(bodyText, { maxUrlWidth });

  // Replace URLs in processed text with truncated display versions
  let displayText = processedBody.processedText;
  const urlRefs = processedBody.urls;
  const urls = urlRefs.map((ref) => ref.fullUrl);

  for (const urlRef of [...urlRefs].sort((a, b) => b.startIndex - a.startIndex)) {
    displayText =
      displayText.slice(0, urlRef.startIndex) +
      urlRef.displayText +
      displayText.slice(urlRef.endIndex);
  }

  const bodyViewport = buildBodyViewport(displayText, maxBodyLines, scrollOffset, maxBodyColumns);
  const fromLine = truncateLine(
    formatEmailAddress(email.sender.name, email.sender.email),
    maxBodyColumns
  );
  const toLine = truncateLine(summarizeAddresses(email.recipients), maxBodyColumns);
  const ccLine = truncateLine(summarizeAddresses(email.cc), maxBodyColumns);
  const dateLine = truncateLine(formatDate(email.dateReceived), maxBodyColumns);
  const labelsLine = truncateLine(email.labels.join(', '), maxBodyColumns);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>{truncateLine(email.subject, maxBodyColumns)}</Text>
      <Text>
        <Text color="blue">From: </Text>
        {fromLine}
      </Text>
      {email.recipients.length > 0 && (
        <Text>
          <Text color="blue">To: </Text>
          {toLine}
        </Text>
      )}
      {email.cc.length > 0 && (
        <Text>
          <Text color="blue">Cc: </Text>
          {ccLine}
        </Text>
      )}
      <Text>
        <Text color="blue">Date: </Text>
        {dateLine}
      </Text>
      {email.labels.length > 0 && (
        <Text>
          <Text color="blue">Labels: </Text>
          {labelsLine}
        </Text>
      )}

      <Text dimColor>{'-'.repeat(Math.max(10, maxBodyColumns - 2))}</Text>

      {bodyText ? (
        <>
          <Box flexDirection="column">
            {bodyViewport.lines.map((line, index) => (
              <Text key={`${bodyViewport.startLine}-${index}`}>
                {padToDisplayWidth(
                  truncateToDisplayWidth(line, Math.max(1, maxBodyColumns - 3)),
                  Math.max(1, maxBodyColumns - 3)
                )}
              </Text>
            ))}
          </Box>
          <Text dimColor>
            Lines {bodyViewport.startLine}-{bodyViewport.endLine} of {bodyViewport.totalLines}
            {bodyViewport.canScrollUp ? ' • [ up' : ''}
            {bodyViewport.canScrollDown ? ' • ] down' : ''}
            {urls.length > 0 ? ` • ${selectedIndex + 1}/${urls.length} URLs` : ''}
            {statusMessage && ' • ' + statusMessage.substring(0, maxBodyColumns - 20)}
            {urls.length === 0 && ' • No URLs in this email'}
          </Text>
        </>
      ) : (
        <Text dimColor>No content available</Text>
      )}
    </Box>
  );
}
