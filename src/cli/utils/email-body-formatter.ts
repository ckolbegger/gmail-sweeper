/**
 * Email Body Formatter
 *
 * Formats email body content with blank line collapsing and URL replacement.
 */

export interface FormatOptions {
  maxWidth: number;
  htmlBody?: string;
  /** Optional override for max link text width (defaults to maxWidth / 2) */
  maxLinkTextWidth?: number;
}

/**
 * Represents a link segment within formatted text with position tracking
 */
export interface LinkSegment {
  /** Start position (character index) in the formatted text */
  start: number;
  /** End position (character index) in the formatted text */
  end: number;
  /** The display text of the link */
  text: string;
  /** The original URL */
  url: string;
}

/**
 * Result of formatting email body with link position tracking
 */
export interface FormattedEmailBody {
  /** The formatted text content */
  text: string;
  /** Array of link segments with their positions */
  links: LinkSegment[];
}

/**
 * Collapse 3+ consecutive blank lines to exactly 2
 */
export function collapseBlankLines(text: string): string {
  // Replace 3+ consecutive newlines with exactly 2 newlines
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Extract links from HTML body and create replacement map
 * Handles nested HTML tags in link text and malformed HTML gracefully
 */
export function extractLinksFromHtml(html: string): Map<string, string> {
  const linkMap = new Map<string, string>();
  
  // Match anchor tags and extract href and text content
  // This regex handles multiline content and captures everything until </a>
  const anchorRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)(?:<\/a>|$)/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const url = match[1];
    // Strip HTML tags from link text content
    let text = match[2].replace(/<[^>]+>/g, '');
    // Trim whitespace
    text = text.trim();
    // Store even if URL is empty (tests expect this)
    linkMap.set(url, text);
  }
  return linkMap;
}

/**
 * Replace URLs with link text, truncating to maxWidth/2
 * Also shortens any URLs not found in the link map
 */
export function replaceUrlsWithLinkText(
  text: string,
  linkMap: Map<string, string>,
  maxLinkTextWidth: number
): string {
  // First, replace known URLs with their link text
  let result = text;
  for (const [url, linkText] of linkMap.entries()) {
    const truncatedText =
      linkText.length > maxLinkTextWidth
        ? linkText.slice(0, maxLinkTextWidth - 3) + '...'
        : linkText;
    // Escape special regex characters in URL
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const urlRegex = new RegExp(escapedUrl, 'g');
    result = result.replace(urlRegex, truncatedText);
  }
  
  // Then, shorten any remaining URLs not in the map
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  result = result.replace(urlRegex, (url) => shortenUrl(url, maxLinkTextWidth));
  
  return result;
}

/**
 * Shorten a raw URL for display when no link text available
 */
export function shortenUrl(url: string, maxLength: number): string {
  try {
    // Remove protocol for display
    const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
    
    // Normalize: remove trailing slash from domain-only URLs
    const normalized = urlWithoutProtocol.replace(/\/$/, '');
    
    // If URL fits within limit, return normalized form
    if (normalized.length <= maxLength) {
      return normalized;
    }
    
    // Otherwise, use domain/.../last-segment format
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const lastSegment = pathParts[pathParts.length - 1] || '';

    const shortened = `${domain}/.../${lastSegment}`;

    if (shortened.length > maxLength) {
      // If even shortened is too long, truncate
      const available = maxLength - domain.length - 6; // 6 = "/.../".length
      if (available > 0 && lastSegment) {
        return `${domain}/.../${lastSegment.slice(0, available)}`;
      }
      // Fallback: just truncate the whole thing
      return normalized.slice(0, maxLength - 3) + '...';
    }
    return shortened;
  } catch {
    // If URL parsing fails, truncate the raw string (minus protocol)
    const withoutProtocol = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return withoutProtocol.length > maxLength 
      ? withoutProtocol.slice(0, maxLength - 3) + '...' 
      : withoutProtocol;
  }
}

/**
 * Detect and shorten URLs in plain text
 */
export function shortenPlainTextUrls(text: string, maxUrlLength: number): string {
  // Match http/https URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, (url) => shortenUrl(url, maxUrlLength));
}

/**
 * Main formatting function combining all transformations
 */
export function formatEmailBody(
  textBody: string,
  options: FormatOptions
): string {
  let result = textBody;

  // First collapse excessive blank lines
  result = collapseBlankLines(result);

  // Then handle URL replacements
  const linkMap = options.htmlBody ? extractLinksFromHtml(options.htmlBody) : new Map<string, string>();
  const maxLinkTextWidth = options.maxLinkTextWidth ?? Math.floor(options.maxWidth / 2);
  result = replaceUrlsWithLinkText(result, linkMap, maxLinkTextWidth);

  return result;
}

/**
 * Format email body with link position tracking
 * 
 * Two-pass approach:
 * 1. Find all URLs in the original text and determine their replacement text
 * 2. Build the formatted text while tracking the position of each link
 */
export function formatEmailBodyWithLinks(
  textBody: string,
  options: FormatOptions
): FormattedEmailBody {
  let text = textBody;
  const links: LinkSegment[] = [];

  // First collapse excessive blank lines
  text = collapseBlankLines(text);

  // Get link map from HTML if provided
  const linkMap = options.htmlBody ? extractLinksFromHtml(options.htmlBody) : new Map<string, string>();
  const maxLinkTextWidth = options.maxLinkTextWidth ?? Math.floor(options.maxWidth / 2);

  // First pass: collect all URLs and their replacement texts
  // We need to find URLs in order and track their positions
  const urlMatches: Array<{ url: string; start: number; end: number; replacement: string }> = [];
  
  // Find all URLs in the text
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    const end = start + url.length;
    
    // Determine the replacement text for this URL
    let replacement: string;
    const linkText = linkMap.get(url);
    if (linkText !== undefined) {
      // Use link text from HTML, truncate if needed
      replacement = linkText.length > maxLinkTextWidth
        ? linkText.slice(0, maxLinkTextWidth - 3) + '...'
        : linkText;
    } else {
      // Shorten the URL itself
      replacement = shortenUrl(url, maxLinkTextWidth);
    }
    
    urlMatches.push({ url, start, end, replacement });
  }

  // Second pass: build result text and track link positions
  // We build from left to right, tracking the offset change from replacements
  let resultText = '';
  let currentOffset = 0;
  let originalPosition = 0;

  for (const urlMatch of urlMatches) {
    // Add text before this URL
    const textBefore = text.slice(originalPosition, urlMatch.start);
    resultText += textBefore;
    currentOffset += textBefore.length;

    // Add the replacement text and track the link position
    const linkStart = currentOffset;
    const linkEnd = currentOffset + urlMatch.replacement.length;
    
    links.push({
      start: linkStart,
      end: linkEnd,
      text: urlMatch.replacement,
      url: urlMatch.url,
    });

    resultText += urlMatch.replacement;
    currentOffset += urlMatch.replacement.length;
    originalPosition = urlMatch.end;
  }

  // Add any remaining text after the last URL
  resultText += text.slice(originalPosition);

  return { text: resultText, links };
}
