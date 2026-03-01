export interface UrlInfo {
  originalUrl: string;
  displayText: string;
  startIndex: number;
  endIndex: number;
}

export interface ProcessedContent {
  lines: string[];
  urls: Map<number, UrlInfo[]>;
}

const URL_REGEX = /https?:\/\/[^\s]+/gi;

export function parseUrls(lines: string[]): ProcessedContent {
  const urlMap = new Map<number, UrlInfo[]>();

  lines.forEach((line, lineIndex) => {
    const matches: UrlInfo[] = [];
    let match;

    while ((match = URL_REGEX.exec(line)) !== null) {
      const url = match[0];
      matches.push({
        originalUrl: url,
        displayText: url,
        startIndex: match.index,
        endIndex: match.index + url.length,
      });
    }

    if (matches.length > 0) {
      urlMap.set(lineIndex, matches);
    }
  });

  return {
    lines,
    urls: urlMap,
  };
}
