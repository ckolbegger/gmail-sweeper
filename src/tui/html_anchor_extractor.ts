import { Parser } from 'htmlparser2';

const DEFAULT_MAX_HTML_BYTES = 1024 * 1024;

const DEFAULT_HTTP_PORT = '80';
const DEFAULT_HTTPS_PORT = '443';

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' '
};

export interface HtmlAnchorExtractionResult {
  anchorTextByNormalizedUrl: Map<string, string>;
  ambiguousUrls: Set<string>;
  skippedReason?: 'too_large' | 'parse_error';
}

interface ExtractHtmlAnchorMetadataOptions {
  maxHtmlBytes?: number;
}

interface AnchorCandidate {
  href?: string;
  title?: string;
  ariaLabel?: string;
  textParts: string[];
}

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (match) => HTML_ENTITY_MAP[match] ?? match);
}

function normalizeAnchorText(input: string): string {
  return decodeHtmlEntities(input).replace(/\s+/g, ' ').trim();
}

function normalizePathname(pathname: string): string {
  if (pathname.length === 0) {
    return '/';
  }

  const withoutTrailing = pathname.replace(/\/+$/g, '');
  return withoutTrailing.length === 0 ? '/' : withoutTrailing;
}

function normalizeDefaultPort(url: URL): void {
  if (
    (url.protocol === 'http:' && url.port === DEFAULT_HTTP_PORT) ||
    (url.protocol === 'https:' && url.port === DEFAULT_HTTPS_PORT)
  ) {
    url.port = '';
  }
}

export function normalizeUrlForMatching(rawUrl: string): string | undefined {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }

    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.search = '';
    parsed.hash = '';
    normalizeDefaultPort(parsed);
    parsed.pathname = normalizePathname(parsed.pathname);

    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return undefined;
  }
}

function resolveHref(href: string | undefined, baseHref?: string): string | undefined {
  const value = href?.trim();
  if (!value) {
    return undefined;
  }

  try {
    const direct = new URL(value);
    if (direct.protocol === 'http:' || direct.protocol === 'https:') {
      return direct.toString();
    }
  } catch {
    // Continue to relative resolution.
  }

  if (!baseHref) {
    return undefined;
  }

  try {
    const resolved = new URL(value, baseHref);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return undefined;
    }
    return resolved.toString();
  } catch {
    return undefined;
  }
}

function resolveBaseHref(rawHref: string | undefined): string | undefined {
  if (!rawHref) {
    return undefined;
  }

  try {
    const parsed = new URL(rawHref.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function finalizeAnchorCandidate(
  candidate: AnchorCandidate,
  baseHref: string | undefined,
  anchorTextByNormalizedUrl: Map<string, string>,
  urlsByAnchorText: Map<string, Set<string>>
): void {
  const resolvedHref = resolveHref(candidate.href, baseHref);
  const normalizedUrl = resolvedHref ? normalizeUrlForMatching(resolvedHref) : undefined;
  if (!normalizedUrl) {
    return;
  }

  const visibleText = normalizeAnchorText(candidate.textParts.join(''));
  const titleText = normalizeAnchorText(candidate.title ?? '');
  const ariaText = normalizeAnchorText(candidate.ariaLabel ?? '');
  const anchorText = visibleText || titleText || ariaText;
  if (!anchorText) {
    return;
  }

  if (!anchorTextByNormalizedUrl.has(normalizedUrl)) {
    anchorTextByNormalizedUrl.set(normalizedUrl, anchorText);
  }

  const urlsForText = urlsByAnchorText.get(anchorText) ?? new Set<string>();
  urlsForText.add(normalizedUrl);
  urlsByAnchorText.set(anchorText, urlsForText);
}

export function extractHtmlAnchorMetadata(
  htmlBody: string | undefined,
  options: ExtractHtmlAnchorMetadataOptions = {}
): HtmlAnchorExtractionResult {
  const result: HtmlAnchorExtractionResult = {
    anchorTextByNormalizedUrl: new Map<string, string>(),
    ambiguousUrls: new Set<string>()
  };

  if (!htmlBody || htmlBody.length === 0) {
    return result;
  }

  const maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML_BYTES;
  if (Buffer.byteLength(htmlBody, 'utf8') > maxHtmlBytes) {
    return {
      ...result,
      skippedReason: 'too_large'
    };
  }

  const urlsByAnchorText = new Map<string, Set<string>>();
  let currentBaseHref: string | undefined;
  let currentAnchor: AnchorCandidate | undefined;

  try {
    const parser = new Parser(
      {
        onopentag(name, attributes) {
          const lowerName = name.toLowerCase();
          if (lowerName === 'base' && !currentBaseHref) {
            currentBaseHref = resolveBaseHref(attributes.href);
            return;
          }

          if (lowerName === 'a') {
            currentAnchor = {
              href: attributes.href,
              title: attributes.title,
              ariaLabel: attributes['aria-label'],
              textParts: []
            };
          }
        },
        ontext(text) {
          if (!currentAnchor) {
            return;
          }
          currentAnchor.textParts.push(text);
        },
        onclosetag(name) {
          if (name.toLowerCase() !== 'a' || !currentAnchor) {
            return;
          }

          finalizeAnchorCandidate(
            currentAnchor,
            currentBaseHref,
            result.anchorTextByNormalizedUrl,
            urlsByAnchorText
          );
          currentAnchor = undefined;
        }
      },
      { decodeEntities: true }
    );

    parser.write(htmlBody);
    parser.end();
  } catch {
    return {
      ...result,
      skippedReason: 'parse_error'
    };
  }

  for (const normalizedUrls of urlsByAnchorText.values()) {
    if (normalizedUrls.size <= 1) {
      continue;
    }
    for (const normalizedUrl of normalizedUrls) {
      result.ambiguousUrls.add(normalizedUrl);
    }
  }

  return result;
}
