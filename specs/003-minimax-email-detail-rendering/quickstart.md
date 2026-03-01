# Quickstart: Email Detail Rendering

**Feature**: Email Detail Rendering Improvements
**Date**: 2026-02-28

## For Developers

### What Changed

The `EmailPreview` component now processes email body content before rendering:
1. Collapses 3+ consecutive blank lines to exactly 2
2. Converts URLs to clickable link text (truncated to 50% terminal width)
3. Enables copy-to-clipboard and click-to-open for URLs

### Key Files

| File | Purpose |
|------|---------|
| `src/tui/components/EmailPreview.tsx` | Main component - modified |
| `src/core/rendering/blank-lines.ts` | NEW - blank line collapsing |
| `src/core/rendering/url-parser.ts` | NEW - URL detection & processing |
| `src/core/rendering/text-truncator.ts` | NEW - width-based truncation |
| `src/tui/hooks/useUrlActions.ts` | NEW - clipboard & browser actions |

### Processing Flow

```
Email.bodyText
    ↓
collapseBlankLines()  [src/core/rendering/blank-lines.ts]
    ↓
parseUrls()           [src/core/rendering/url-parser.ts]
    ↓
EmailPreview renders lines + clickable URLs
```

### Testing

```bash
# Run all tests
npm test

# Run specific rendering tests
npm test -- rendering

# Run with coverage
npm run test:coverage
```

### New Dependencies

May need to add (check during implementation):
- `open` - for opening URLs in browser (cross-platform)
- Clipboard support (built-in Node or @clipboardy/clipboardy)

### Verification

1. Select any email in the inbox
2. Verify blank lines are max 2 between paragraphs
3. Long URLs should show as truncated link text (e.g., "example.com/...")
4. Try copying a URL - full URL should be in clipboard
5. Try clicking a URL - browser should open

---

*Quickstart complete. See tasks.md for implementation tasks.*
