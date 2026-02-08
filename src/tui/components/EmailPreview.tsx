/**
 * T047: EmailPreview component - displays full email content.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Email } from '../../core/models/index.js';

interface EmailPreviewProps {
  email?: Email;
  maxHeight?: number;
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

export function EmailPreview({ email, maxHeight = 20 }: EmailPreviewProps) {
  if (!email) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>No email selected. Select an email from the list.</Text>
      </Box>
    );
  }

  const body = email.bodyText || (email.bodyHtml ? htmlToText(email.bodyHtml) : '');
  const bodyLines = body.split('\n');
  const displayedLines = maxHeight ? bodyLines.slice(0, maxHeight) : bodyLines;

  return (
    <Box flexDirection="column" padding={1} width="100%">
      {/* Header */}
      <Text bold>{email.subject}</Text>

      {/* From/To */}
      <Box flexDirection="row" marginY={1}>
        <Text>From: </Text>
        <Text>{email.sender.name || email.sender.email}</Text>
      </Box>

      <Box flexDirection="row" marginY={1}>
        <Text>To: </Text>
        <Text>{formatRecipients(email.recipients)}</Text>
      </Box>

      {/* Attachments indicator */}
      {email.hasAttachments && (
        <Box marginY={1}>
          <Text>📎 Has attachments</Text>
        </Box>
      )}

      {/* Body */}
      <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="gray">
        {displayedLines.length > 0 ? (
          displayedLines.map((line, idx) => (
            <Text key={idx}>{line}</Text>
          ))
        ) : (
          <Text>(No body)</Text>
        )}
      </Box>
    </Box>
  );
}
