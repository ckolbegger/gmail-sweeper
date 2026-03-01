export const BLANK_LINE_BODY = ['Header', '', '', '', 'Body line', '   ', '   ', '', 'Footer'].join('\n');

export const URL_HEAVY_BODY = [
  'Visit https://example.com/path/to/resource?utm_source=test#section for details.',
  'Then open https://docs.example.org/reference/api?foo=bar.'
].join('\n');

export const HTML_VS_PLAIN_BODY = 'Read https://example.com/news?utm_campaign=abc#top for today updates.';

export const HTML_VS_PLAIN_ANCHORS = `
  <html>
    <head><base href="https://example.com/" /></head>
    <body>
      <a href="/news?utm_campaign=abc#top">Daily Briefing</a>
      <a href="https://docs.example.org/reference/api?foo=bar">Developer Docs</a>
    </body>
  </html>
`;
