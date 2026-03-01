/**
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
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Collapse runs of 3 or more consecutive blank lines to exactly 2 blank lines.
 */
export function collapseBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let consecutiveBlanks = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      consecutiveBlanks++;
      if (consecutiveBlanks <= 2) {
        result.push(line);
      }
    } else {
      consecutiveBlanks = 0;
      result.push(line);
    }
  }
  return result;
}

/**
 * Truncate a string to at most `maxLength` characters.
 * If truncation occurs, replaces the tail with a single ellipsis character '…'.
 */
export function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 1) return '…';
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Main pipeline: process raw email body content into display-ready lines with link metadata.
 */
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-control-regex
const SENTINEL_RE = /\x00LINK(\d+)\x00/g;

interface SentinelEntry {
  displayText: string;
  fullUrl: string;
}

function extractLinksFromHtml(html: string, halfWidth: number): { processed: string; sentinels: SentinelEntry[] } {
  const sentinels: SentinelEntry[] = [];
  const processed = html.replace(/<a\s[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href: string, innerHtml: string) => {
    const rawText = innerHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
    const displayText = rawText.length > 0
      ? truncateWithEllipsis(rawText, halfWidth)
      : truncateWithEllipsis(href, halfWidth);
    const idx = sentinels.length;
    sentinels.push({ displayText, fullUrl: href });
    return `\x00LINK${idx}\x00`;
  });
  return { processed, sentinels };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function buildResult(rawLines: string[], sentinels: SentinelEntry[]): BodyProcessingResult {
  const collapsed = collapseBlankLines(rawLines);
  const allLinks: LinkInfo[] = [];
  const lines: ProcessedLine[] = collapsed.map((lineText, lineIndex) => {
    const lineLinks: LinkInfo[] = [];
    const resolvedText = lineText.replace(SENTINEL_RE, (_m, idxStr: string) => {
      const idx = parseInt(idxStr, 10);
      const entry = sentinels[idx];
      if (!entry) return '';
      const link: LinkInfo = {
        index: allLinks.length,
        displayText: entry.displayText,
        fullUrl: entry.fullUrl,
        lineIndex,
      };
      allLinks.push(link);
      lineLinks.push(link);
      return entry.displayText;
    });
    return { text: resolvedText, links: lineLinks };
  });
  return { lines, allLinks };
}

// ---------------------------------------------------------------------------
// Plain-text URL detection
// ---------------------------------------------------------------------------

const URL_RE = /(https?:\/\/|mailto:)[^\s<>"]+/g;

function processPlainText(rawBody: string, halfWidth: number): BodyProcessingResult {
  const rawLines = rawBody.split('\n');
  const collapsed = collapseBlankLines(rawLines);
  const allLinks: LinkInfo[] = [];
  const lines: ProcessedLine[] = collapsed.map((lineText, lineIndex) => {
    const lineLinks: LinkInfo[] = [];
    const resolvedText = lineText.replace(URL_RE, (match) => {
      const displayText = truncateWithEllipsis(match, halfWidth);
      const link: LinkInfo = {
        index: allLinks.length,
        displayText,
        fullUrl: match,
        lineIndex,
      };
      allLinks.push(link);
      lineLinks.push(link);
      return displayText;
    });
    return { text: resolvedText, links: lineLinks };
  });
  return { lines, allLinks };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function processEmailBody(
  rawBody: string,
  isHtml: boolean,
  paneWidth: number
): BodyProcessingResult {
  const halfWidth = Math.floor(paneWidth / 2);
  const normalized = rawBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!isHtml) {
    return processPlainText(normalized, halfWidth);
  }
  const { processed, sentinels } = extractLinksFromHtml(normalized, halfWidth);
  const stripped = stripHtml(processed);
  const rawLines = stripped.split('\n');
  return buildResult(rawLines, sentinels);
}
