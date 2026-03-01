export function truncateToWidth(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) {
    return text;
  }

  const availableWidth = maxWidth - 3; // Account for "..."
  if (availableWidth < 1) {
    return '...';
  }

  return text.slice(0, availableWidth) + '...';
}

export function calculateDisplayText(url: string, terminalWidth: number): string {
  const halfWidth = Math.floor(terminalWidth / 2);

  if (url.length <= halfWidth) {
    return url;
  }

  // Extract domain from URL
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;

    const availableForPath = halfWidth - domain.length - 4; // "/" + "..."

    if (availableForPath <= 0) {
      return truncateToWidth(domain, halfWidth);
    }

    const truncatedPath = truncateToWidth(path.slice(1), availableForPath);
    return `${domain}/${truncatedPath}`;
  } catch {
    // If URL parsing fails, just truncate the whole thing
    return truncateToWidth(url, halfWidth);
  }
}
