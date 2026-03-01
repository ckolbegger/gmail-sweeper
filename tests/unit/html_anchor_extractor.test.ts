import { describe, expect, it } from 'vitest';

import {
  extractHtmlAnchorMetadata,
  normalizeUrlForMatching
} from '@/tui/html_anchor_extractor.js';

describe('html anchor extractor', () => {
  it('should normalize urls by stripping query and fragments and default ports', () => {
    expect(normalizeUrlForMatching('https://Example.com:443/path/?a=1#x')).toBe(
      'https://example.com/path'
    );
    expect(normalizeUrlForMatching('http://Example.com:80/path/?q=1')).toBe('http://example.com/path');
  });

  it('should return first anchor text for a normalized url', () => {
    const result = extractHtmlAnchorMetadata(`
      <a href="https://example.com/news?utm_source=a">First Label</a>
      <a href="https://example.com/news?utm_source=b">Second Label</a>
    `);

    expect(result.anchorTextByNormalizedUrl.get('https://example.com/news')).toBe('First Label');
  });

  it('should mark urls ambiguous when one anchor text maps to multiple urls', () => {
    const result = extractHtmlAnchorMetadata(`
      <a href="https://example.com/a">Shared Text</a>
      <a href="https://example.com/b">Shared Text</a>
    `);

    expect(result.ambiguousUrls.has('https://example.com/a')).toBe(true);
    expect(result.ambiguousUrls.has('https://example.com/b')).toBe(true);
  });

  it('should use title and aria-label when visible text is empty', () => {
    const result = extractHtmlAnchorMetadata(`
      <a href="https://example.com/title" title="Title Label"></a>
      <a href="https://example.com/aria" aria-label="Aria Label"></a>
    `);

    expect(result.anchorTextByNormalizedUrl.get('https://example.com/title')).toBe('Title Label');
    expect(result.anchorTextByNormalizedUrl.get('https://example.com/aria')).toBe('Aria Label');
  });

  it('should resolve relative links only via base href', () => {
    const withBase = extractHtmlAnchorMetadata(`
      <base href="https://example.com/docs/" />
      <a href="../guide?x=1#top">Guide</a>
    `);
    const withoutBase = extractHtmlAnchorMetadata('<a href="/guide">Guide</a>');

    expect(withBase.anchorTextByNormalizedUrl.get('https://example.com/guide')).toBe('Guide');
    expect(withoutBase.anchorTextByNormalizedUrl.size).toBe(0);
  });

  it('should ignore non-http schemes', () => {
    const result = extractHtmlAnchorMetadata(`
      <a href="mailto:test@example.com">Mail</a>
      <a href="https://example.com/path">Web</a>
    `);

    expect(result.anchorTextByNormalizedUrl.get('https://example.com/path')).toBe('Web');
    expect(result.anchorTextByNormalizedUrl.size).toBe(1);
  });

  it('should decode entities and collapse anchor whitespace', () => {
    const result = extractHtmlAnchorMetadata(
      '<a href="HTTPS://EXAMPLE.com/Path?x=1#y">  Daily   &amp;   Briefing  </a>'
    );

    expect(result.anchorTextByNormalizedUrl.get('https://example.com/Path')).toBe('Daily & Briefing');
  });

  it('should skip extraction when html exceeds max size', () => {
    const html = `<a href="https://example.com/">A</a>${'x'.repeat(1024 * 1024)}`;
    const result = extractHtmlAnchorMetadata(html);

    expect(result.skippedReason).toBe('too_large');
    expect(result.anchorTextByNormalizedUrl.size).toBe(0);
  });
});
