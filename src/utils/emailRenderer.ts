export interface RenderedLink {
    id: string;
    text: string;
    url: string;
    lineIndex: number;
}

export interface ParsedEmailBody {
    content: string;
    links: RenderedLink[];
}

export interface IEmailRenderer {
    /**
     * Parses raw HTML or plain text email body, collapses blank lines,
     * extracts links, and truncates link text based on maxWidth.
     */
    parse(rawBody: string, maxWidth: number): ParsedEmailBody;
}

export class EmailRenderer implements IEmailRenderer {
    parse(rawBody: string, maxWidth: number): ParsedEmailBody {
        // Collapse 3 or more consecutive newlines into exactly 3 newlines
        // (which results in 2 empty lines between text blocks)
        let content = rawBody.replace(/\n{4,}/g, '\n\n\n');
        
        const links: RenderedLink[] = [];
        const limit = Math.max(10, Math.floor(maxWidth * 0.5));
        
        let linkIdCounter = 0;

        // Extract markdown links [text](url)
        content = content.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, (match, text, url) => {
            let display = text;
            if (display.length > limit) {
                display = display.substring(0, limit - 3) + '...';
            }
            const placeholder = `__LINK_${linkIdCounter}__`;
            links.push({
                id: `link-${linkIdCounter++}`,
                text: display,
                url: url,
                lineIndex: 0
            });
            return placeholder;
        });

        // Extract raw URLs
        // We have to be careful to match proper URLs and not trailing punctuation.
        content = content.replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
            let display = url;
            if (display.length > limit) {
                // End-truncation
                display = display.substring(0, limit - 3) + '...';
            }
            const placeholder = `__LINK_${linkIdCounter}__`;
            links.push({
                id: `link-${linkIdCounter++}`,
                text: display,
                url: url,
                lineIndex: 0
            });
            return placeholder;
        });

        // Calculate lineIndex and insert display text
        // Note: multiple links might be on the same line.
        let finalContent = content;
        links.forEach((link, index) => {
            const placeholder = `__LINK_${index}__`;
            const pos = finalContent.indexOf(placeholder);
            if (pos !== -1) {
                const newlinesBefore = (finalContent.substring(0, pos).match(/\n/g) || []).length;
                link.lineIndex = newlinesBefore;
                finalContent = finalContent.replace(placeholder, link.text);
            }
        });

        // Now we need to account for the fact that the text before this might have grown or shrunk.
        // Wait, if we replace left-to-right, the newlines before might be correct if no newlines are added/removed in the display texts, which they aren't (we don't add newlines).
        // Let's refine how we calculate lineIndex to be perfectly safe:
        // Actually, splitting by \n is robust. Let's do that.
        let resultLines = finalContent.split('\n');
        // Wait, if I just calculated lineIndex based on `indexOf`, it IS exactly the number of \n characters before it. That works!

        return {
            content: finalContent,
            links
        };
    }
}
