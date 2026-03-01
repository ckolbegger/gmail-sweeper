# Data Model: Email Detail Rendering Improvements

**Feature**: 003-email-rendering
**Date**: 2026-02-28

## Entities

### DetailRenderInput

Represents the data required to render a message body in the detail pane.

| Field | Type | Description |
|-------|------|-------------|
| body | string | Raw decoded email body text from Gmail detail retrieval |
| detailPaneWidth | number | Effective pane width used for truncation rules |

**Validation Rules**:
- `body` defaults to empty string if unavailable.
- `detailPaneWidth` is treated as a positive integer; invalid values fall back to a safe renderer default.

### BlankLineRun

Represents a contiguous sequence of blank or whitespace-only lines discovered during normalization.

| Field | Type | Description |
|-------|------|-------------|
| startLineIndex | number | Zero-based index where the run starts |
| endLineIndex | number | Zero-based index where the run ends |
| originalLength | number | Number of lines in the original run |
| normalizedLength | number | Number of lines after applying cap (max 2) |

**Rule**: `normalizedLength = min(originalLength, 2)`.

### UrlMatch

Represents a URL candidate detected in body text after punctuation-safe matching.

| Field | Type | Description |
|-------|------|-------------|
| originalUrl | string | URL value excluding trailing punctuation |
| trailingPunctuation | string | Stripped trailing punctuation sequence, if any |
| displaySource | `'anchor' \| 'hostname'` | Source used to create display token |
| displayToken | string | Rendered readable token prior to truncation |
| truncatedDisplayToken | string | Final token shown after width-cap truncation |
| wasTruncated | boolean | Whether truncation was applied |

### DetailRenderOutput

Represents the final detail body prepared for `renderEmailPreview`.

| Field | Type | Description |
|-------|------|-------------|
| renderedBody | string | Body text after blank-line and URL-token transformations |
| replacedUrlCount | number | Number of URL replacements performed |
| maxAllowedTokenLength | number | Effective truncation cap used (`max(12, floor(width/2))`) |

## Relationships

```text
DetailRenderInput
   ├── produces -> BlankLineRun[] (normalization pass)
   ├── produces -> UrlMatch[] (URL transformation pass)
   └── produces -> DetailRenderOutput
```

## State Transitions

### Rendering Pipeline

```text
[Raw Body]
   -> [Split Into Lines]
   -> [Blank-Line Run Detection]
   -> [Blank-Line Collapse Applied]
   -> [URL Detection + Punctuation Trim]
   -> [Display Token Derivation (anchor|hostname)]
   -> [Width-Cap Truncation]
   -> [Rendered Body]
```

## Notes

- No persistent schema changes are introduced.
- URL-to-original mapping persistence is explicitly out of scope for this feature (FR-007).
