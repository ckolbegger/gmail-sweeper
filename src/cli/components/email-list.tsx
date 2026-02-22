/**
 * Email List TUI Component
 *
 * Displays a list of emails with keyboard navigation.
 */

import { Box, Text, useInput } from 'ink';
import type { Email } from '../../core/models/email.js';
import { useEffect, useMemo, useState } from 'react';

export type SortField = 'date' | 'sender' | 'subject' | 'label' | 'category';

export interface EmailListProps {
  emails: Email[];
  selectedId?: string;
  onSelect?: (email: Email) => void;
  sort?: { field: SortField; direction: 'asc' | 'desc' };
  onSort?: (field: SortField) => void;
  maxVisibleRows?: number;
  /** Number of emails after filtering (for display) */
  filterCount?: number;
  /** Total emails before filtering (for display) */
  totalCount?: number;
}

function charDisplayWidth(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;
  if (/\p{Extended_Pictographic}/u.test(char)) {
    return 2;
  }

  return codePoint > 0xffff ? 2 : 1;
}

export function truncateDisplay(value: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }

  let width = 0;
  for (const char of value) {
    width += charDisplayWidth(char);
    if (width > maxWidth) {
      let result = '';
      let resultWidth = 0;
      const budget = Math.max(1, maxWidth - 1);

      for (const segment of value) {
        const segmentWidth = charDisplayWidth(segment);
        if (resultWidth + segmentWidth > budget) {
          break;
        }
        result += segment;
        resultWidth += segmentWidth;
      }

      return `${result.trimEnd()}…`;
    }
  }

  return value;
}

export function toAscii(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '').trimStart();
}

export function EmailList({ emails, selectedId, onSelect, sort, maxVisibleRows, filterCount, totalCount }: EmailListProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = emails.findIndex((e) => e.id === selectedId);
    return idx >= 0 ? idx : 0;
  });

  const displayedEmails = emails;

  useEffect(() => {
    const idx = displayedEmails.findIndex((email) => email.id === selectedId);
    if (idx >= 0) {
      setSelectedIndex(idx);
      return;
    }

    setSelectedIndex((current) => Math.min(current, Math.max(displayedEmails.length - 1, 0)));
  }, [selectedId, displayedEmails]);

  const maxRows = Math.max(1, (maxVisibleRows ?? displayedEmails.length) || 1);

  const windowStart = useMemo(() => {
    if (displayedEmails.length <= maxRows) {
      return 0;
    }

    const centeredStart = selectedIndex - Math.floor(maxRows / 2);
    const maxStart = displayedEmails.length - maxRows;
    return Math.max(0, Math.min(centeredStart, maxStart));
  }, [displayedEmails.length, maxRows, selectedIndex]);

  const windowEnd = Math.min(displayedEmails.length, windowStart + maxRows);
  const visibleEmails = displayedEmails.slice(windowStart, windowEnd);

  // Handle keyboard navigation
  useInput((_input, key) => {
    if (displayedEmails.length === 0) {
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((current) => {
        const next = Math.max(0, current - 1);
        const nextEmail = displayedEmails[next];
        if (nextEmail) {
          onSelect?.(nextEmail);
        }
        return next;
      });
    } else if (key.downArrow) {
      setSelectedIndex((current) => {
        const next = Math.min(displayedEmails.length - 1, current + 1);
        const nextEmail = displayedEmails[next];
        if (nextEmail) {
          onSelect?.(nextEmail);
        }
        return next;
      });
    } else if (key.return && displayedEmails[selectedIndex]) {
      onSelect?.(displayedEmails[selectedIndex]);
    }
  });

  // Handle empty state
  if (displayedEmails.length === 0) {
    // Show "No matches found" if filter is active
    if (filterCount !== undefined && totalCount !== undefined && totalCount > 0) {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Text dimColor>No matches found</Text>
          <Text dimColor>Filtered: 0/{totalCount} emails</Text>
        </Box>
      );
    }
    return (
      <Box paddingX={1}>
        <Text dimColor>No emails found</Text>
      </Box>
    );
  }

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getSortIndicator = (field: string) => {
    if (sort?.field === field) {
      return sort.direction === 'asc' ? '↑' : '↓';
    }
    return ' ';
  };

  // Show headers with sort indicators
  const headers = (
    <Box flexDirection="row" paddingX={1} borderStyle="single" borderBottom>
      <Box width={40}>
        <Text bold>{getSortIndicator('subject')} Subject</Text>
      </Box>
      <Box width={25}>
        <Text bold>{getSortIndicator('sender')} Sender</Text>
      </Box>
      <Box width={12}>
        <Text bold>{getSortIndicator('date')} Date</Text>
      </Box>
    </Box>
  );

  // Show email list
  const list = (
    <Box flexDirection="column">
      {windowStart > 0 && (
        <Box paddingX={1}>
          <Text dimColor>↑ {windowStart} earlier emails</Text>
        </Box>
      )}

      {visibleEmails.map((email, index) => {
        const absoluteIndex = windowStart + index;
        const isSelected = absoluteIndex === selectedIndex;
        const isUnread = !email.isRead;

        return (
          <Box key={email.id} flexDirection="row" paddingX={1} borderStyle={undefined}>
            <Box width={40}>
              <Text bold={isUnread} dimColor={!isSelected}>
                {isSelected
                  ? `> ${truncateDisplay(toAscii(email.subject), 36)}`
                  : `  ${truncateDisplay(toAscii(email.subject), 36)}`}
              </Text>
            </Box>
            <Box width={25}>
              <Text dimColor={!isSelected}>
                {truncateDisplay(email.sender.name || email.sender.email, 23)}
              </Text>
            </Box>
            <Box width={12}>
              <Text dimColor={!isSelected}>{formatDate(email.dateReceived)}</Text>
            </Box>
          </Box>
        );
      })}

      {windowEnd < displayedEmails.length && (
        <Box paddingX={1}>
          <Text dimColor>↓ {displayedEmails.length - windowEnd} more emails</Text>
        </Box>
      )}
    </Box>
  );

  return (
    <Box flexDirection="column">
      {/* Show filter count if active */}
      {filterCount !== undefined && totalCount !== undefined && (
        <Box paddingX={1} borderStyle="single" borderBottom>
          <Text dimColor>Filtered: {filterCount}/{totalCount} emails</Text>
        </Box>
      )}
      {headers}
      {list}
    </Box>
  );
}
