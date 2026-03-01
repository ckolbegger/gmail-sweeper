# Quickstart: Detail Pane Content Formatting

**Feature**: 003-detail-content-format
**Date**: 2026-02-28

## What This Feature Does

Improves email body rendering in the detail pane with two core changes:

1. **Blank line collapse** — consecutive blank lines (3+) collapse to exactly 2
2. **URL formatting** — long URLs replaced with link text; all URLs capped at half the pane width

Plus optional URL interaction (Tab to focus, `c` to copy, `o` to open in browser).

## New Module

**`src/core/text/body-formatter.ts`** — all body-processing logic lives here as pure functions.

```typescript
import { processEmailBody } from '../../core/text/body-formatter.js';

const { lines, allLinks } = processEmailBody(
  email.bodyText ?? email.bodyHtml ?? '',
  !email.bodyText && !!email.bodyHtml,
  paneWidth
);
```

## Updated Component

**`src/tui/components/EmailPreview.tsx`** — accepts new optional `paneWidth` prop:

```tsx
<EmailPreview
  email={selectedEmail}
  maxHeight={previewHeight}
  scrollOffset={previewScrollOffset}
  paneWidth={detailPaneWidth}   // new — defaults to 80
/>
```

## Key Behaviours

| Input | Output |
|-------|--------|
| 5 consecutive blank lines | Rendered as exactly 2 blank lines |
| `<a href="https://very.long.url/path">Click here</a>` | Shows `Click here` (or truncated if >half width) |
| Bare `https://very.long.url/path/...` in plain text | Truncated to half pane width with `…` |
| Tab while URLs visible | Moves focus to next URL (highlighted) |
| `c` on focused URL | Full original URL copied to clipboard |
| `o` on focused URL | Opens full URL in system default browser |

## Running Tests

```bash
npm test -- tests/unit/core/text/body-formatter.test.ts
npm test -- tests/unit/tui/EmailPreview.test.tsx
npm test   # full suite
```

## File Checklist

| File | Status |
|------|--------|
| `src/core/text/body-formatter.ts` | New |
| `src/tui/components/EmailPreview.tsx` | Modified |
| `tests/unit/core/text/body-formatter.test.ts` | New |
| `tests/unit/tui/EmailPreview.test.tsx` | Extended |
