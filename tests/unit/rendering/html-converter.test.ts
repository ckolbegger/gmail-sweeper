import { describe, it, expect } from 'vitest';
import { convertHtmlToText } from '../../../src/core/rendering/html-converter.js';

describe('convertHtmlToText', () => {
  it('should remove HTML tags', () => {
    const html = '<p>Hello World</p>';
    expect(convertHtmlToText(html)).toBe('Hello World');
  });

  it('should handle nested tags', () => {
    const html = '<div><p>Hello <strong>World</strong></p></div>';
    expect(convertHtmlToText(html)).toBe('Hello World');
  });

  it('should replace common HTML entities', () => {
    const html = '<p>&nbsp;&lt;test&gt;&amp;</p>';
    expect(convertHtmlToText(html)).toBe('<test>&');
  });

  it('should remove script and style tags', () => {
    const html = '<script>alert("x")</script><p>Hello</p><style>.foo{}</style>';
    expect(convertHtmlToText(html)).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(convertHtmlToText('')).toBe('');
  });

  it('should handle text without HTML', () => {
    expect(convertHtmlToText('Plain text')).toBe('Plain text');
  });

  it('should collapse multiple whitespace', () => {
    const html = '<p>Hello    World</p>';
    expect(convertHtmlToText(html)).toBe('Hello World');
  });
});
