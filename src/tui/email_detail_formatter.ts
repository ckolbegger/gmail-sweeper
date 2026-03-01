import {
  extractHtmlAnchorMetadata,
  normalizeUrlForMatching,
  type HtmlAnchorExtractionResult
} from '@/tui/html_anchor_extractor.js';

const MINIMUM_LINK_TOKEN_CAP = 12;
const TRAILING_URL_PUNCTUATION = /[.,;:!?)\]]+$/;
const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

export interface FormatEmailDetailBodyInput {
  body: string;
  htmlBody?: string;
  detailPaneWidth: number;
}

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n?/g, '\n');
}

function splitTrailingPunctuation(urlLike: string): { url: string; trailing: string } {
  const trailing = urlLike.match(TRAILING_URL_PUNCTUATION)?.[0] ?? '';
  if (trailing.length === 0) {
    return { url: urlLike, trailing: '' };
  }

  return {
    url: urlLike.slice(0, -trailing.length),
    trailing
  };
}

function getTokenCap(detailPaneWidth: number): number {
  const width = Number.isFinite(detailPaneWidth) ? Math.floor(detailPaneWidth) : 0;
  return Math.max(MINIMUM_LINK_TOKEN_CAP, Math.floor(width / 2));
}

function extractHostname(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.toLowerCase() || rawUrl;
  } catch {
    return rawUrl;
  }
}

function resolveDisplayToken(
  rawUrl: string,
  anchorTextByNormalizedUrl: Map<string, string>,
  ambiguousUrls: Set<string>
): string {
  const normalizedUrl = normalizeUrlForMatching(rawUrl);
  if (normalizedUrl && !ambiguousUrls.has(normalizedUrl)) {
    const anchorText = anchorTextByNormalizedUrl.get(normalizedUrl);
    if (anchorText && anchorText.trim().length > 0) {
      return anchorText;
    }
  }

  return extractHostname(rawUrl);
}

export function collapseBlankLineRuns(body: string): string {
  if (body.length === 0) {
    return '';
  }

  const lines = normalizeLineEndings(body).split('\n');
  const collapsed: string[] = [];
  let blankRunLength = 0;

  for (const line of lines) {
    if (/^\s*$/.test(line)) {
      blankRunLength += 1;
      if (blankRunLength <= 2) {
        collapsed.push('');
      }
      continue;
    }

    blankRunLength = 0;
    collapsed.push(line);
  }

  return collapsed.join('\n');
}

export function truncateDisplayToken(token: string, detailPaneWidth: number): string {
  const cap = getTokenCap(detailPaneWidth);
  if (token.length <= cap) {
    return token;
  }

  if (cap <= 3) {
    return '.'.repeat(cap);
  }

  return `${token.slice(0, cap - 3)}...`;
}

export function formatEmailDetailBody(input: FormatEmailDetailBodyInput): string {
  const normalizedBody = collapseBlankLineRuns(input.body);
  let anchorMetadata: HtmlAnchorExtractionResult;
  try {
    anchorMetadata = extractHtmlAnchorMetadata(input.htmlBody);
  } catch {
    anchorMetadata = {
      anchorTextByNormalizedUrl: new Map<string, string>(),
      ambiguousUrls: new Set<string>()
    };
  }

  return normalizedBody.replace(HTTP_URL_PATTERN, (urlLike) => {
    const { url, trailing } = splitTrailingPunctuation(urlLike);
    if (!url) {
      return urlLike;
    }

    const displayToken = resolveDisplayToken(
      url,
      anchorMetadata.anchorTextByNormalizedUrl,
      anchorMetadata.ambiguousUrls
    );
    const truncatedToken = truncateDisplayToken(displayToken, input.detailPaneWidth);
    return `${truncatedToken}${trailing}`;
  });
}
