# Data Model: Email Detail Rendering

**Feature**: Email Detail Rendering Improvements
**Date**: 2026-02-28

## Overview

This feature processes email body content for display in the TUI detail pane. It transforms raw email text into formatted output with:
- Collapsed blank lines (max 2)
- Processed URLs with display text and metadata

## Data Structures

### Input

```typescript
interface Email {
  id: string;
  subject: string;
  sender: { email: string; name?: string };
  recipients: Array<{ email: string; name?: string }>;
  bodyText?: string;
  bodyHtml?: string;
  hasAttachments: boolean;
  // ... other fields
}
```

### Processing

```typescript
// Blank line processing
type ProcessedBody = string;
// Result: body with max 2 consecutive blank lines

// URL processing
interface UrlInfo {
  originalUrl: string;     // Full URL for clipboard/browser
  displayText: string;     // Truncated display (max 50% width)
  lineIndex: number;        // Which line contains the URL
  startChar: number;       // Character position in line
  endChar: number;         // Character position in line
}

interface ProcessedContent {
  lines: string[];                    // Body lines after blank collapse
  urls: Map<number, UrlInfo[]>;       // URLs per line (lineIndex -> urls)
}
```

### Output (Component Props)

```typescript
interface EmailPreviewProps {
  email: Email | undefined;
  maxHeight: number;
  scrollOffset?: number;
  terminalWidth?: number;   // NEW: for truncation calculation
}
```

## Processing Pipeline

```
Email.bodyText 
    → collapseBlankLines() 
    → parseUrls() 
    → render EmailPreview
```

### Step 1: Blank Line Collapse

```typescript
function collapseBlankLines(text: string): string {
  // Replace 3+ consecutive newlines with exactly 2
  return text.replace(/\n{3,}/g, '\n\n');
}
```

### Step 2: URL Parsing

```typescript
// Regex patterns
const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const WWW_PATTERN = /www\.[^\s]+/gi;

function parseUrls(lines: string[]): ProcessedContent {
  // For each line, find URLs and create UrlInfo entries
  // Store original URL + calculated display text
}
```

### Step 3: Display Text Calculation

```typescript
function calculateDisplayText(url: string, maxWidth: number): string {
  const halfWidth = Math.floor(maxWidth / 2);
  if (url.length <= halfWidth) return url;
  
  // Show domain + truncated path
  const domain = extractDomain(url);
  const availableForPath = halfWidth - domain.length - 4; // "..." = 3 + buffer
  return domain + "/" + truncate(url.path, availableForPath) + "...";
}
```

## Validation Rules

1. **Blank Lines**: Must be exactly 2 after processing (never more, never less)
2. **URL Display**: Must not exceed 50% of terminal width
3. **URL Original**: Must preserve full URL for clipboard/open actions
4. **Edge Cases**:
   - Empty body → show "(No body)"
   - Only URL in email → render as single link
   - Malformed URL → skip processing, render as plain text

---

*Data model complete.*
