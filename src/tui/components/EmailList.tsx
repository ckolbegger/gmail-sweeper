/**
 * T044: EmailList component - displays list of emails with selection and virtualization.
 */

import { Box, Text } from 'ink';
import type { Email } from '../../core/models/index.js';

interface EmailListProps {
  emails: Email[];
  selectedIndex: number;
  maxSubjectLength?: number;
  viewportHeight?: number;
  filterCount?: number;
  totalCount?: number;
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
  maxSubjectLength = 60,
  viewportHeight = 10,
  filterCount,
  totalCount,
}: EmailListProps) {
  const isFilterActive = filterCount !== undefined;
  // Ensure selected index stays within bounds
  const clampedSelectedIndex = Math.max(0, Math.min(selectedIndex, emails.length - 1));

  // Calculate visible range for virtualization
  const startIndex = Math.max(0, clampedSelectedIndex - Math.floor(viewportHeight / 2));
  const endIndex = Math.min(emails.length, startIndex + viewportHeight);
  const visibleEmails = emails.slice(startIndex, endIndex);

  if (emails.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>{isFilterActive ? 'No matches found' : 'No emails in inbox'}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      {isFilterActive && (
        <Box>
          <Text>Filtered: {filterCount}/{totalCount} emails</Text>
        </Box>
      )}
      {visibleEmails.map((email, visibleIndex) => {
        const actualIndex = startIndex + visibleIndex;
        const isSelected = actualIndex === clampedSelectedIndex;
        const displayStyle = isSelected ? { inverse: true } : {};

        return (
          <Box key={email.id} flexDirection="row" padding={0} {...displayStyle}>
            {/* Selection indicator */}
            <Box width={1}>
              <Text>{isSelected ? '>' : ' '}</Text>
            </Box>

            {/* Subject - T045: Bold for unread emails */}
            <Box width="40%">
              <Text bold={!email.isRead}>
                {email.isRead ? ' ' : '• '}
                {truncateSubject(email.subject, maxSubjectLength)}
              </Text>
            </Box>

            {/* Sender */}
            <Box width="30%">
              <Text>{email.sender.name || email.sender.email}</Text>
            </Box>

            {/* Date */}
            <Box width="20%">
              <Text>{formatRelativeDate(email.date)}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
