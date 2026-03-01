/**
 * Email Content Processor
 *
 * Transforms raw email body text into display-ready format,
 * applying blank line collapsing and URL formatting rules.
 */

/**
 * Represents a URL detected in email body content
 */
export interface URLReference {
  /** The complete, unmodified URL */
  fullUrl: string;
  /** Truncated text for display (≤ half pane width) */
  displayText: string;
  /** Character position where URL starts in processed text */
  startIndex: number;
  /** Character position where URL ends in processed text */
  endIndex: number;
  /** True if displayText was truncated */
  isTruncated: boolean;
}

/**
 * Result of processing email body
 */
export interface ProcessedBody {
  /** Original email body text */
  originalText: string;
  /** Text with blank lines collapsed */
  processedText: string;
  /** All URLs found in the body */
  urls: URLReference[];
  /** Total number of URLs detected */
  urlCount: number;
}

/**
 * Options for body processing
 */
export interface ProcessOptions {
  /** Maximum display width for URL truncation */
  maxUrlWidth: number;
}

/**
 * Calculate the display width of a character
 * Handles Unicode, emoji, and wide characters
 */
function charDisplayWidth(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0;
  // Emojis and extended pictographics are typically 2 columns wide
  if (/\p{Extended_Pictographic}/u.test(char)) {
    return 2;
  }
  // Characters outside BMP (like some CJK) are typically 2 columns wide
  return codePoint > 0xffff ? 2 : 1;
}

/**
 * Calculate the total display width of a string
 */
function getDisplayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += charDisplayWidth(char);
  }
  return width;
}

/**
 * Collapse sequences of 3+ consecutive blank lines to exactly 2
 * @param text - Input text
 * @returns Text with collapsed blank lines
 */
export function collapseBlankLines(text: string): string {
  // Replace 3 or more consecutive newlines with exactly 2 newlines
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * Truncate URL to fit display width using middle ellipsis
 * @param url - Full URL
 * @param maxWidth - Maximum display width
 * @returns Truncated URL with ellipsis if needed, or full URL if it fits
 */
export function truncateUrl(url: string, maxWidth: number): string {
  const fullWidth = getDisplayWidth(url);

  // Return unchanged if it fits
  if (fullWidth <= maxWidth) {
    return url;
  }

  const ellipsis = '…';
  const ellipsisWidth = getDisplayWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  if (targetWidth <= 0) {
    // Even ellipsis won't fit, return minimal
    return ellipsis;
  }

  // Split: 60% for start (domain), 40% for end (path context)
  const startWidth = Math.floor(targetWidth * 0.6);
  const endWidth = targetWidth - startWidth;

  // Build start portion
  let start = '';
  let currentWidth = 0;
  for (const char of url) {
    const w = charDisplayWidth(char);
    if (currentWidth + w > startWidth) break;
    start += char;
    currentWidth += w;
  }

  // Build end portion (from end of string)
  let end = '';
  currentWidth = 0;
  for (let i = url.length - 1; i >= 0; i--) {
    const w = charDisplayWidth(url[i]!);
    if (currentWidth + w > endWidth) break;
    end = url[i] + end;
    currentWidth += w;
  }

  return start + ellipsis + end;
}



/**
 * URL detection regex
 * Matches http://, https://, and www. URLs
 */
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>(){}[\]"']+/gi;

/**
 * Detect all URLs in text
 * @param text - Input text
 * @param maxDisplayWidth - Maximum width for display text
 * @returns Array of URL references
 */
export function detectUrls(text: string, maxDisplayWidth: number): URLReference[] {
  const urls: URLReference[] = [];

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const fullUrl = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + fullUrl.length;

    const fullWidth = getDisplayWidth(fullUrl);
    const isTruncated = fullWidth > maxDisplayWidth;
    const displayText = isTruncated ? truncateUrl(fullUrl, maxDisplayWidth) : fullUrl;

    urls.push({
      fullUrl,
      displayText,
      startIndex,
      endIndex,
      isTruncated,
    });
  }

  return urls;
}

/**
 * Process email body text for display
 * @param body - Raw email body text
 * @param options - Processing options
 * @returns Processed body with collapsed blank lines and detected URLs
 */
export function process(body: string, options: ProcessOptions): ProcessedBody {
  const processedText = collapseBlankLines(body);
  const urls = detectUrls(processedText, options.maxUrlWidth);

  return {
    originalText: body,
    processedText,
    urls,
    urlCount: urls.length,
  };
}
