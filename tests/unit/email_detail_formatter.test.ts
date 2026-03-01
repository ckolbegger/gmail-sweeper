import { describe, expect, it, vi } from 'vitest';

import {
  BLANK_LINE_BODY,
  HTML_VS_PLAIN_ANCHORS,
  HTML_VS_PLAIN_BODY,
  URL_HEAVY_BODY
} from './fixtures/email_detail_rendering.fixtures.js';

import {
  collapseBlankLineRuns,
  formatEmailDetailBody,
  truncateDisplayToken
} from '@/tui/email_detail_formatter.js';
import * as htmlAnchorExtractor from '@/tui/html_anchor_extractor.js';

describe('email detail formatter', () => {
  it('should collapse blank and whitespace-only line runs to two lines', () => {
    const formatted = collapseBlankLineRuns(BLANK_LINE_BODY);

    expect(formatted).toContain('Header\n\n\nBody line');
    expect(formatted).toContain('Body line\n\n\nFooter');
    expect(formatted).not.toContain('\n\n\n\n');
  });

  it('should preserve trailing punctuation when replacing urls', () => {
    const formatted = formatEmailDetailBody({
      body: URL_HEAVY_BODY,
      detailPaneWidth: 80
    });

    expect(formatted).toContain('Visit example.com for details.');
    expect(formatted).toContain('docs.example.org.');
  });

  it('should prefer html anchor text over plain url labels when urls normalize equally', () => {
    const formatted = formatEmailDetailBody({
      body: HTML_VS_PLAIN_BODY,
      htmlBody: HTML_VS_PLAIN_ANCHORS,
      detailPaneWidth: 80
    });

    expect(formatted).toContain('Daily Briefing');
    expect(formatted).not.toContain('https://example.com/news');
  });

  it('should fall back to hostname when html anchor text is ambiguous', () => {
    const formatted = formatEmailDetailBody({
      body: 'Compare https://example.com/a and https://example.com/b',
      htmlBody: `
        <a href="https://example.com/a">Shared Text</a>
        <a href="https://example.com/b">Shared Text</a>
      `,
      detailPaneWidth: 80
    });

    expect(formatted).toContain('example.com');
    expect(formatted).not.toContain('Shared Text');
  });

  it('should truncate display tokens to max(12, floor(width/2)) with ellipsis in cap', () => {
    const token = truncateDisplayToken('Very Long Display Token For Testing', 20);
    const formatted = formatEmailDetailBody({
      body: 'Read https://really-long-hostname.example.com/path',
      detailPaneWidth: 20
    });

    expect(token).toHaveLength(12);
    expect(token.endsWith('...')).toBe(true);
    expect(formatted).toContain('...');
  });

  it('should silently fall back when html parsing input exceeds max size', () => {
    const formatted = formatEmailDetailBody({
      body: 'Check https://example.com/path',
      htmlBody: `<a href="https://example.com/path">Preferred</a>${'x'.repeat(1024 * 1024)}`,
      detailPaneWidth: 80
    });

    expect(formatted).toContain('example.com');
    expect(formatted).not.toContain('Preferred');
  });

  it('should fall back to hostname when normalized anchor text is empty', () => {
    const formatted = formatEmailDetailBody({
      body: 'Check https://example.com/path',
      htmlBody: '<a href="https://example.com/path">   </a>',
      detailPaneWidth: 80
    });

    expect(formatted).toContain('example.com');
    expect(formatted).not.toContain('https://example.com/path');
  });

  it('should replace multiple urls on a single line independently', () => {
    const formatted = formatEmailDetailBody({
      body: 'Compare https://example.com/a?x=1 and https://docs.example.org/b?y=2.',
      detailPaneWidth: 80
    });

    expect(formatted).toContain('example.com');
    expect(formatted).toContain('docs.example.org.');
    expect(formatted).not.toContain('https://example.com/a');
    expect(formatted).not.toContain('https://docs.example.org/b');
  });

  it('should keep malformed url-like tokens without throwing', () => {
    const formatted = formatEmailDetailBody({
      body: 'Broken link token https:// and valid https://example.com/path',
      detailPaneWidth: 80
    });

    expect(formatted).toContain('https://');
    expect(formatted).toContain('example.com');
  });

  it('should silently fall back when html extraction throws', () => {
    const spy = vi
      .spyOn(htmlAnchorExtractor, 'extractHtmlAnchorMetadata')
      .mockImplementation(() => {
        throw new Error('parse failed');
      });

    try {
      const formatted = formatEmailDetailBody({
        body: 'Visit https://example.com/path',
        htmlBody: '<a href="https://example.com/path">Preferred</a>',
        detailPaneWidth: 80
      });

      expect(formatted).toContain('example.com');
      expect(formatted).not.toContain('Preferred');
    } finally {
      spy.mockRestore();
    }
  });
});
