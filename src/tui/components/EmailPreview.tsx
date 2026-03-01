/**
 * T047: EmailPreview component - displays full email content.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import type { Email } from '../../core/models/index.js';
import { processEmailBody } from '../../core/text/body-formatter.js';
import type { LinkInfo, ProcessedLine } from '../../core/text/body-formatter.js';

function copyToClipboard(url: string): void {
  const os = platform();
  if (os === 'darwin') {
    const proc = spawn('pbcopy', { stdio: ['pipe', 'ignore', 'ignore'] });
    proc.stdin.write(url);
    proc.stdin.end();
  } else {
    // Try wl-copy first (Wayland), fall back to xclip (X11)
    const proc = spawn('wl-copy', [url], { stdio: 'ignore' });
    proc.on('error', () => {
      spawn('xclip', ['-selection', 'clipboard'], { stdio: ['pipe', 'ignore', 'ignore'] })
        .stdin.end(url);
    });
  }
}

function openInBrowser(url: string): void {
  const os = platform();
  const cmd = os === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
}

interface EmailPreviewProps {
  email: Email | undefined;
  maxHeight: number;
  scrollOffset?: number;
  paneWidth?: number;
}

/**
 * Format recipient list
 */
function formatRecipients(recipients: Array<{ email: string; name?: string }>): string {
  return recipients
    .map(r => r.name || r.email)
    .join(', ');
}

export function EmailPreview({ email, maxHeight = 20, scrollOffset = 0, paneWidth = 80 }: EmailPreviewProps) {
  const [focusedLinkIndex, setFocusedLinkIndex] = useState<number | null>(null);

  // Process body upfront (before hooks) so allLinks is available
  let processedLines: ProcessedLine[] = [];
  let allLinks: LinkInfo[] = [];
  let totalLines = 0;

  if (email) {
    const rawBody = email.bodyText ?? (email.bodyHtml ?? '');
    const isHtml = !email.bodyText && !!email.bodyHtml;
    const result = processEmailBody(rawBody, isHtml, paneWidth);
    processedLines = result.lines;
    allLinks = result.allLinks;
    totalLines = processedLines.length;
  }

  // Reset focus when email changes
  useEffect(() => {
    setFocusedLinkIndex(null);
  }, [email?.id]);

  useInput((input, key) => {
    if (key.tab && !key.shift) {
      if (allLinks.length > 0) {
        setFocusedLinkIndex(prev => prev === null ? 0 : (prev + 1) % allLinks.length);
      }
    } else if (key.tab && key.shift) {
      if (allLinks.length > 0) {
        setFocusedLinkIndex(prev => {
          if (prev === null) return allLinks.length - 1;
          return (prev - 1 + allLinks.length) % allLinks.length;
        });
      }
    } else if (input === 'c' && focusedLinkIndex !== null) {
      const link = allLinks[focusedLinkIndex];
      if (link) copyToClipboard(link.fullUrl);
    } else if (input === 'o' && focusedLinkIndex !== null) {
      const link = allLinks[focusedLinkIndex];
      if (link) openInBrowser(link.fullUrl);
    }
  });

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

  const clampedOffset = Math.min(scrollOffset, Math.max(0, totalLines - bodyMaxLines));
  const displayedLines = processedLines.slice(clampedOffset, clampedOffset + bodyMaxLines);
  const hasMore = clampedOffset + bodyMaxLines < totalLines;
  const hasScrolledDown = clampedOffset > 0;

  const focusedLink: LinkInfo | null = focusedLinkIndex !== null ? allLinks[focusedLinkIndex] ?? null : null;

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Text bold wrap="truncate">{email.subject}</Text>
      <Text wrap="truncate">From: {email.sender.name || email.sender.email}</Text>
      <Text wrap="truncate">To: {formatRecipients(email.recipients)}</Text>
      {email.hasAttachments && <Text>📎 Has attachments</Text>}
      <Text dimColor>{'─'.repeat(40)}</Text>

      {/* Body */}
      {displayedLines.length > 0 ? (
        displayedLines.map((pLine, idx) => {
          if (focusedLink && pLine.links.some(l => l.index === focusedLink.index)) {
            const link = pLine.links.find(l => l.index === focusedLink.index)!;
            const parts = pLine.text.split(link.displayText);
            if (parts.length >= 2) {
              return (
                <Text key={idx} wrap="truncate">
                  {parts[0]}<Text inverse>{link.displayText}</Text>{parts.slice(1).join(link.displayText)}
                </Text>
              );
            }
          }
          return <Text key={idx} wrap="truncate">{pLine.text}</Text>;
        })
      ) : (
        <Text dimColor>(No body)</Text>
      )}

      {/* Scroll indicator */}
      <Text dimColor>
        {hasScrolledDown ? '↑ ' : '  '}
        Lines {clampedOffset + 1}-{Math.min(clampedOffset + bodyMaxLines, totalLines)} of {totalLines}
        {hasMore ? ' ↓' : ''}
        {(hasMore || hasScrolledDown) ? '  [/] scroll' : ''}
        {allLinks.length > 0
          ? focusedLinkIndex !== null
            ? `  [tab] url ${focusedLinkIndex + 1}/${allLinks.length}`
            : '  [tab] url'
          : ''}
      </Text>
    </Box>
  );
}
