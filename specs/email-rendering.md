# Email Rendering Enhancement Specification

## Overview
Enhance the email detail pane rendering to improve readability by:
1. Collapsing excessive blank lines (3+ → 2)
2. Replacing raw URLs with link text, truncated to half the detail pane width

## Requirements

### 1. Blank Line Collapsing
- Any sequence of 3 or more consecutive blank lines should be collapsed to exactly 2 blank lines
- Applies to the entire email body content
- Preserve intentional single/double line breaks

**Example:**
```
Line 1




Line 2   →   Line 1


             Line 2
```

### 2. URL Replacement with Link Text
- Detect URLs in both plain text and HTML email bodies
- Extract link text from `<a>` tags when HTML is available
- Replace raw URLs with their link text when available
- Truncate link text to maximum 50% of the detail pane width
- If no link text is available, shorten the URL to `domain.com/.../last-segment`
- **Link text/shortened URLs should be rendered in cyan color** (fallback: blue if cyan not visible) to visually distinguish them from body text

**Example with HTML:**
```html
<a href="https://very-long-url.example.com/path/to/resource">Click here</a>
```
Renders as: `Click here` (truncated to 50% width if needed, in cyan color)

**Example plain text (no link text):**
```
https://very-long-url.example.com/path/to/resource
```
Renders as: `very-long-url.example.com/.../resource` (in cyan color)

### 3. Integration Points

#### `src/cli/components/email-detail.tsx`
- Use new formatter functions before `wrapText()`
- Pass available width to formatter (calculated from terminal or fixed max)

#### `src/core/contracts/types.ts`
- EmailBody already has `text` and `html` fields

## Technical Approach

### New Module: `src/cli/utils/email-body-formatter.ts`

```typescript
export interface FormatOptions {
  maxWidth: number;
  htmlBody?: string;
}

/**
 * Collapse 3+ consecutive blank lines to exactly 2
 */
export function collapseBlankLines(text: string): string;

/**
 * Extract links from HTML body and create replacement map
 */
export function extractLinksFromHtml(html: string): Map<string, string>;

/**
 * Replace URLs with link text, truncating to maxWidth/2
 */
export function replaceUrlsWithLinkText(
  text: string, 
  linkMap: Map<string, string>,
  maxLinkTextWidth: number
): string;

/**
 * Shorten a raw URL for display when no link text available
 */
export function shortenUrl(url: string, maxLength: number): string;

/**
 * Main formatting function combining all transformations
 */
export function formatEmailBody(
  textBody: string,
  options: FormatOptions
): string;
```

### URL Detection Regex
- Match http/https URLs
- Include common URL terminators handling
- Exclude trailing punctuation that may be part of surrounding text

### HTML Parsing Strategy
- Use simple regex to extract `<a href="...">text</a>` tags
- Map URL → link text
- Handle relative URLs by resolving against base (if needed)

## Test Cases

### Blank Line Collapsing
1. `\n\n\n` → `\n\n`
2. `\n\n\n\n\n` → `\n\n`
3. `Line1\n\n\n\nLine2` → `Line1\n\nLine2`
4. `Line1\n\nLine2` → `Line1\n\nLine2` (unchanged, only 2 lines)

### URL Replacement
1. Plain text URL → shortened form
2. URL with link text from HTML → link text displayed
3. Very long link text → truncated with ellipsis
4. Multiple URLs in same text → all replaced

### Integration
1. Email with HTML body uses link text
2. Email with text-only body uses URL shortening
3. Combined blank line + URL processing

## File Changes

### New Files
- `src/cli/utils/email-body-formatter.ts` - Core formatting logic
- `tests/unit/cli/utils/email-body-formatter.test.ts` - Unit tests

### Modified Files
- `src/cli/components/email-detail.tsx` - Integrate formatter
- `tests/unit/cli/components/email-detail.test.tsx` - Add rendering tests

## Acceptance Criteria
- [ ] 3+ blank lines collapse to exactly 2
- [ ] URLs replaced with link text when HTML available
- [ ] URLs shortened when no link text available
- [ ] Link text never exceeds 50% of available width
- [ ] Link text/shortened URLs rendered in different color than body text
- [ ] All existing tests pass
- [ ] New unit tests cover edge cases
