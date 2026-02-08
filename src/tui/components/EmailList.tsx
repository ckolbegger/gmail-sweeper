/**
 * T044: EmailList component - displays list of emails with selection and virtualization.
 */

import React, { useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import type { Email } from '../../core/models/index.js';

interface EmailListProps {
  emails: Email[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  maxSubjectLength?: number;
  viewportHeight?: number;
}

/**
 * Format relative date (today, yesterday, or date string)
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays < 1) {
    return 'today';
  } else if (diffDays < 2) {
    return 'yesterday';
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Truncate subject to max length
 */
function truncateSubject(subject: string, maxLength: number = 60): string {
  if (subject.length <= maxLength) {
    return subject;
  }
  return subject.substring(0, maxLength) + '…';
}

export function EmailList({
  emails,
  selectedIndex,
  onSelect,
  maxSubjectLength = 60,
  viewportHeight = 10,
}: EmailListProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Ensure selected index stays within bounds
  const clampedSelectedIndex = Math.max(0, Math.min(selectedIndex, emails.length - 1));

  // Calculate visible range for virtualization
  const startIndex = Math.max(0, clampedSelectedIndex - Math.floor(viewportHeight / 2));
  const endIndex = Math.min(emails.length, startIndex + viewportHeight);
  const visibleEmails = emails.slice(startIndex, endIndex);

  if (emails.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>No emails in inbox</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      {visibleEmails.map((email, visibleIndex) => {
        const actualIndex = startIndex + visibleIndex;
        const isSelected = actualIndex === clampedSelectedIndex;
        const displayStyle = isSelected ? { inverse: true } : {};

        return (
          <Box key={email.id} flexDirection="row" padding={0} {...displayStyle}>
            {/* Selection indicator */}
            <Text width={1}>{isSelected ? '>' : ' '}</Text>

            {/* Subject */}
            <Text width="40%">
              {email.isRead ? '' : ' '}
              {email.isRead ? ' ' : '• '}
              {truncateSubject(email.subject, maxSubjectLength)}
            </Text>

            {/* Sender */}
            <Text width="30%">{email.sender.name || email.sender.email}</Text>

            {/* Date */}
            <Text width="20%">{formatRelativeDate(email.date)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
