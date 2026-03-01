import { describe, it, expect } from 'vitest';
import { parseUrls } from '../../../src/core/rendering/url-parser.js';

describe('parseUrls', () => {
  it('should detect https URLs', () => {
    const lines = ['Check out https://example.com for more info'];
    const result = parseUrls(lines);

    expect(result.urls.size).toBe(1);
    const urlInfos = result.urls.get(0);
    expect(urlInfos).toBeDefined();
    expect(urlInfos?.[0]?.originalUrl).toBe('https://example.com');
  });

  it('should detect http URLs', () => {
    const lines = ['Visit http://test.org today'];
    const result = parseUrls(lines);

    expect(result.urls.size).toBe(1);
    expect(result.urls.get(0)?.[0]?.originalUrl).toBe('http://test.org');
  });

  it('should detect multiple URLs on same line', () => {
    const lines = ['Check https://a.com and https://b.com'];
    const result = parseUrls(lines);

    expect(result.urls.get(0)?.length).toBe(2);
  });

  it('should detect URLs on multiple lines', () => {
    const lines = ['First https://one.com', 'Second https://two.com'];
    const result = parseUrls(lines);

    expect(result.urls.size).toBe(2);
    expect(result.urls.get(0)?.[0]?.originalUrl).toBe('https://one.com');
    expect(result.urls.get(1)?.[0]?.originalUrl).toBe('https://two.com');
  });

  it('should handle URLs with query parameters', () => {
    const lines = ['Link: https://example.com/path?a=1&b=2'];
    const result = parseUrls(lines);

    expect(result.urls.get(0)?.[0]?.originalUrl).toBe('https://example.com/path?a=1&b=2');
  });

  it('should return empty urls map for text with no URLs', () => {
    const lines = ['Just some plain text'];
    const result = parseUrls(lines);

    expect(result.urls.size).toBe(0);
  });

  it('should handle empty lines array', () => {
    const lines: string[] = [];
    const result = parseUrls(lines);

    expect(result.urls.size).toBe(0);
    expect(result.lines).toEqual([]);
  });
});
