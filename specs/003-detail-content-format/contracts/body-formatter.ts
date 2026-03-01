/**
 * Contract: src/core/text/body-formatter.ts
 *
 * Pure functions for transforming email body content before display.
 * No side effects, no I/O, no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkInfo {
  /** Zero-based position among all links in this processed body */
  index: number;
  /** Text shown in the detail pane — link text (HTML) or truncated URL (plain text) */
  displayText: string;
  /** Full original URL — never truncated or modified */
  fullUrl: string;
  /** Index into ProcessedLine[] where this link's displayText appears */
  lineIndex: number;
}

export interface ProcessedLine {
  /** Display text of the line after all transforms */
  text: string;
  /** Links whose displayText appears within this line */
  links: LinkInfo[];
}

export interface BodyProcessingResult {
  /** All processed lines, ready for rendering */
  lines: ProcessedLine[];
  /** Flat ordered list of all links across all lines (for Tab cycling) */
  allLinks: LinkInfo[];
}

// ---------------------------------------------------------------------------
// Exported function signatures (implementation in body-formatter.ts)
// ---------------------------------------------------------------------------

/**
 * Collapse runs of 3 or more consecutive blank lines to exactly 2 blank lines.
 *
 * @param lines - Array of line strings (may contain empty strings for blank lines)
 * @returns New array with blank-line runs collapsed
 */
export declare function collapseBlankLines(lines: string[]): string[];

/**
 * Truncate a string to at most `maxLength` characters.
 * If truncation occurs, replaces the tail with a single ellipsis character '…'.
 *
 * @param text      - Input string
 * @param maxLength - Maximum allowed length including the ellipsis character
 * @returns Truncated string, or original if already within limit
 */
export declare function truncateWithEllipsis(text: string, maxLength: number): string;

/**
 * Main pipeline: process raw email body content into display-ready lines with link metadata.
 *
 * For HTML bodies:
 *   - Extracts <a href="url">text</a> pairs, preserving link text in position
 *   - Strips remaining HTML tags and decodes common HTML entities
 *
 * For plain-text bodies:
 *   - Detects bare http/https URLs via regex; no text substitution (truncation only)
 *
 * Both paths:
 *   - Collapse 3+ consecutive blank lines to 2
 *   - Truncate displayed link text / bare URLs to Math.floor(paneWidth / 2) characters
 *
 * @param rawBody   - Raw email body string (HTML or plain text)
 * @param isHtml    - True if rawBody is HTML; false for plain text
 * @param paneWidth - Current character width of the detail pane (for half-width truncation)
 * @returns BodyProcessingResult with processed lines and extracted links
 */
export declare function processEmailBody(
  rawBody: string,
  isHtml: boolean,
  paneWidth: number
): BodyProcessingResult;
