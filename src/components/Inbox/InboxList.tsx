import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Email } from '../../types';

interface InboxListProps {
    emails: Email[];
    onSelect: (email: Email) => void;
}

export const InboxList: React.FC<InboxListProps> = ({ emails, onSelect }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((_: string, key: any) => {
        if (key.upArrow) {
            setSelectedIndex((prev) => Math.max(0, prev - 1));
        }

        if (key.downArrow) {
            setSelectedIndex((prev) => Math.min(emails.length - 1, prev + 1));
        }

        if (key.return) {
            onSelect(emails[selectedIndex]);
        }
    });

    if (emails.length === 0) {
        return (
            <Box>
                <Text color="gray">No emails found.</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            {emails.map((email, index) => {
                const isSelected = index === selectedIndex;
                const isUnread = email.isUnread;

                return (
                    <Box key={email.id} flexDirection="row">
                        <Text color={isSelected ? 'cyan' : undefined}>
                            {isSelected ? '> ' : '  '}
                        </Text>
                        <Text bold={isUnread} color={isUnread ? 'white' : 'gray'}>
                            {email.from.padEnd(25)}
                        </Text>
                        <Text> | </Text>
                        <Text bold={isUnread}>
                            {email.subject}
                        </Text>
                    </Box>
                );
            })}
        </Box>
    );
};
