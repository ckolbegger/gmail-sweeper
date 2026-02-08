/**
 * T047: EmailPreview component - displays full email content.
 */

import { Box, Text } from 'ink';
import type { Email } from '../../core/models/index.js';

interface EmailPreviewProps {
  email: Email | undefined;
  maxHeight: number;
  scrollOffset?: number;
}

/**
 * Convert HTML to plain text (simple implementation)
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Format recipient list
 */
function formatRecipients(recipients: Array<{ email: string; name?: string }>): string {
  return recipients
    .map(r => r.name || r.email)
    .join(', ');
}

export function EmailPreview({ email, maxHeight = 20, scrollOffset = 0 }: EmailPreviewProps) {
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

  const body = email.bodyText || (email.bodyHtml ? htmlToText(email.bodyHtml) : '');
  const allBodyLines = body.split('\n');
  const totalLines = allBodyLines.length;
  const clampedOffset = Math.min(scrollOffset, Math.max(0, totalLines - bodyMaxLines));
  const displayedLines = allBodyLines.slice(clampedOffset, clampedOffset + bodyMaxLines);
  const hasMore = clampedOffset + bodyMaxLines < totalLines;
  const hasScrolledDown = clampedOffset > 0;

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
        displayedLines.map((line, idx) => (
          <Text key={idx} wrap="truncate">{line}</Text>
        ))
      ) : (
        <Text dimColor>(No body)</Text>
      )}

      {/* Scroll indicator */}
      <Text dimColor>
        {hasScrolledDown ? '↑ ' : '  '}
        Lines {clampedOffset + 1}-{Math.min(clampedOffset + bodyMaxLines, totalLines)} of {totalLines}
        {hasMore ? ' ↓' : ''}
        {(hasMore || hasScrolledDown) ? '  [/] scroll' : ''}
      </Text>
    </Box>
  );
}
