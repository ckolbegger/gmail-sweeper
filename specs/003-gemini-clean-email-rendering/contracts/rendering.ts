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
