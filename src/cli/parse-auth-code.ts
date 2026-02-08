export function parseAuthorizationCode(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('code=')) {
    const withoutPrefix = trimmed.slice('code='.length);
    return decodeURIComponent(withoutPrefix.split('&')[0]);
  }

  if (trimmed.includes('code=')) {
    const match = trimmed.match(/[?&]code=([^&]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return trimmed.split('&')[0];
}
