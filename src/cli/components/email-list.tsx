/**
 * Email List TUI Component
 *
 * Displays a list of emails with keyboard navigation.
 */

import { Box, Text, useInput } from 'ink';
import type { Email } from '../../core/models/email.js';
import { useEffect, useMemo, useState } from 'react';

export interface EmailListProps {
  emails: Email[];
  selectedId?: string;
  onSelect?: (email: Email) => void;
  sort?: { field: 'date' | 'sender' | 'subject'; direction: 'asc' | 'desc' };
  onSort?: (field: 'date' | 'sender' | 'subject') => void;
}

export function EmailList({ emails, selectedId, onSelect, sort, onSort }: EmailListProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = emails.findIndex((e) => e.id === selectedId);
    return idx >= 0 ? idx : 0;
  });

  // Sort emails
  const sortedEmails = useMemo(() => {
    if (!sort) return emails;

    return [...emails].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'date':
          const aTime = a.dateReceived?.getTime() ?? 0;
          const bTime = b.dateReceived?.getTime() ?? 0;
          comparison = aTime - bTime;
          break;
        case 'sender':
          comparison = a.sender.email.localeCompare(b.sender.email);
          break;
        case 'subject':
          comparison = a.subject.localeCompare(b.subject);
          break;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [emails, sort]);

  useEffect(() => {
    const idx = sortedEmails.findIndex((email) => email.id === selectedId);
    if (idx >= 0) {
      setSelectedIndex(idx);
      return;
    }

    setSelectedIndex((current) => Math.min(current, Math.max(sortedEmails.length - 1, 0)));
  }, [selectedId, sortedEmails]);

  useEffect(() => {
    const email = sortedEmails[selectedIndex];
    if (email) {
      onSelect?.(email);
    }
  }, [selectedIndex, sortedEmails, onSelect]);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(sortedEmails.length - 1, i + 1));
    } else if (key.return && sortedEmails[selectedIndex]) {
      onSelect?.(sortedEmails[selectedIndex]);
    } else if (input === 'd' && onSort) {
      onSort('date');
    } else if (input === 's' && onSort) {
      onSort('sender');
    } else if (input === 'u' && onSort) {
      onSort('subject');
    }
  });

  // Handle empty state
  if (sortedEmails.length === 0) {
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

  const truncate = (value: string, maxLength: number): string => {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 1)}…`;
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
      {sortedEmails.map((email, index) => {
        const isSelected = index === selectedIndex;
        const isUnread = !email.isRead;

        return (
          <Box
            key={email.id}
            flexDirection="row"
            paddingX={1}
            borderStyle={isSelected ? 'single' : undefined}
          >
            <Box width={40}>
              <Text bold={isUnread} dimColor={!isSelected}>
                {truncate(email.subject, 38)}
              </Text>
            </Box>
            <Box width={25}>
              <Text dimColor={!isSelected}>
                {truncate(email.sender.name || email.sender.email, 23)}
              </Text>
            </Box>
            <Box width={12}>
              <Text dimColor={!isSelected}>{formatDate(email.dateReceived)}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box flexDirection="column">
      {headers}
      {list}
    </Box>
  );
}
