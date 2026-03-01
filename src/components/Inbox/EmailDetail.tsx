import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Email } from '../../types';
import { EmailRenderer, RenderedLink } from '../../utils/emailRenderer';
import open from 'open';
import clipboardy from 'clipboardy';

interface EmailDetailProps {
    email: Email | null;
    isActive?: boolean;
    terminalWidth: number;
    terminalHeight: number;
}

const renderer = new EmailRenderer();

interface WrappedLine {
    text: string;
    originalLineIndex: number;
}

function wrapText(text: string, width: number): WrappedLine[] {
    const lines: WrappedLine[] = [];
    const sourceLines = text.split('\n');

    for (let i = 0; i < sourceLines.length; i++) {
        const sourceLine = sourceLines[i];
        if (!sourceLine || sourceLine.length <= width) {
            lines.push({ text: sourceLine || '', originalLineIndex: i });
            continue;
        }

        let currentLine = sourceLine;
        while (currentLine.length > width) {
            let wrapAt = currentLine.lastIndexOf(' ', width);
            if (wrapAt === -1 || wrapAt === 0) wrapAt = width;
            
            lines.push({ text: currentLine.substring(0, wrapAt).trimEnd(), originalLineIndex: i });
            currentLine = currentLine.substring(wrapAt).trimStart();
        }
        if (currentLine) lines.push({ text: currentLine, originalLineIndex: i });
    }

    return lines;
}

const renderLineText = (line: WrappedLine, lineLinks: RenderedLink[], focusedLinkId: string | undefined) => {
    if (lineLinks.length === 0) return <Text wrap="truncate-end">{line.text || ' '}</Text>;

    let elements: React.ReactNode[] = [line.text];
    
    lineLinks.forEach(link => {
        const newElements: React.ReactNode[] = [];
        elements.forEach((el, idx) => {
            if (typeof el === 'string') {
                const parts = el.split(link.text);
                parts.forEach((part, pIdx) => {
                    newElements.push(part);
                    if (pIdx < parts.length - 1) {
                        const isFocused = link.id === focusedLinkId;
                        newElements.push(
                            <Text key={`${link.id}-${idx}-${pIdx}`} color={isFocused ? "black" : "cyan"} backgroundColor={isFocused ? "cyan" : undefined} underline={!isFocused}>
                                {link.text}
                            </Text>
                        );
                    }
                });
            } else {
                newElements.push(el);
            }
        });
        elements = newElements;
    });

    return <Text wrap="truncate-end">{elements.length > 0 ? elements.map((e,i) => <React.Fragment key={i}>{e}</React.Fragment>) : ' '}</Text>;
};

export const EmailDetail: React.FC<EmailDetailProps> = ({ 
    email, 
    isActive = false, 
    terminalWidth, 
    terminalHeight 
}) => {
    const [scrollOffset, setScrollOffset] = useState(0);
    const [manualFocusId, setManualFocusId] = useState<string | null>(null);

    const windowHeight = useMemo(() => Math.max(5, terminalHeight - 14), [terminalHeight]);
    const availableWidth = useMemo(() => Math.max(20, Math.floor(terminalWidth * 0.6) - 8), [terminalWidth]);

    const parsedBody = useMemo(() => {
        const bodyText = email?.body || email?.snippet || '';
        return renderer.parse(bodyText, availableWidth);
    }, [email, availableWidth]);

    const allLines = useMemo(() => {
        return wrapText(parsedBody.content, availableWidth);
    }, [parsedBody, availableWidth]);

    const maxOffset = Math.max(0, allLines.length - windowHeight);
    const clampedOffset = Math.min(scrollOffset, maxOffset);
    const visibleLines = allLines.slice(clampedOffset, clampedOffset + windowHeight);

    const links = parsedBody.links;
    
    const topVisibleOriginalLine = visibleLines.length > 0 ? visibleLines[0].originalLineIndex : -1;
    
    const autoFocusLink = useMemo(() => {
        if (links.length === 0) return undefined;
        return links.find(l => l.lineIndex >= topVisibleOriginalLine) || links[links.length - 1];
    }, [links, topVisibleOriginalLine]);

    const focusedLink = manualFocusId ? links.find(l => l.id === manualFocusId) : autoFocusLink;

    useEffect(() => {
        setScrollOffset(0);
        setManualFocusId(null);
    }, [email?.id]);

    useInput((input, key) => {
        if (!isActive) return;

        if (key.upArrow || input === '\u001B[A') {
            setScrollOffset(prev => Math.max(0, prev - 1));
            setManualFocusId(null);
        }
        if (key.downArrow || input === '\u001B[B') {
            setScrollOffset(prev => Math.min(maxOffset, prev + 1));
            setManualFocusId(null);
        }
        
        if (input === '\t' || key.tab) {
            if (links.length === 0) return;
            const currentIndex = links.findIndex(l => l.id === focusedLink?.id);
            const nextIndex = (currentIndex + 1) % links.length;
            const nextLink = links[nextIndex];
            setManualFocusId(nextLink.id);
            
            const lineIndexInAll = allLines.findIndex(l => l.originalLineIndex === nextLink.lineIndex);
            if (lineIndexInAll !== -1) {
                if (lineIndexInAll < clampedOffset || lineIndexInAll >= clampedOffset + windowHeight) {
                    setScrollOffset(lineIndexInAll);
                }
            }
        }

        if ((key.return || input === '\r') && focusedLink) {
            open(focusedLink.url);
        }
        if (input === 'c' && focusedLink) {
            clipboardy.writeSync(focusedLink.url);
        }
    });

    if (!email) {
        return (
            <Box padding={1} width="100%">
                <Text color="gray">Select an email to view details</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor={isActive ? 'blue' : 'gray'} width="100%" height="100%">
            <Box flexDirection="column" marginBottom={1} flexShrink={0}>
                <Text bold color="cyan" wrap="truncate-end">{email.subject}</Text>
                <Text wrap="truncate-end">From: <Text color="green">{email.from}</Text></Text>
                <Text wrap="truncate-end">Date: <Text color="yellow">{email.date}</Text></Text>
            </Box>

            <Box borderStyle="classic" borderColor="gray" paddingX={1} flexDirection="column" flexGrow={1}>
                {visibleLines.map((line, i) => {
                    const lineLinks = links.filter(l => l.lineIndex === line.originalLineIndex);
                    return <Box key={i}>{renderLineText(line, lineLinks, focusedLink?.id)}</Box>;
                })}
                {allLines.length > windowHeight && (
                    <Box marginTop={0}>
                        <Text color="yellow">
                            -- [{clampedOffset + 1}-{Math.min(clampedOffset + windowHeight, allLines.length)} of {allLines.length}] --
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
