# Data Model: Detail Pane Content Formatting

**Phase**: 1 — Design
**Feature**: 003-detail-content-format
**Date**: 2026-02-28

## Entities

### LinkInfo
Represents a hyperlink extracted from email body content. Created during body processing; consumed by `EmailPreview` for display and interaction.

| Field        | Type     | Description                                          | Constraints                    |
|--------------|----------|------------------------------------------------------|--------------------------------|
| `index`      | `number` | Zero-based position among all links in the email    | ≥ 0; unique per processed body |
| `displayText`| `string` | Text shown in the detail pane (link text or URL)    | Never empty; max half pane width after truncation |
| `fullUrl`    | `string` | Full original URL, never modified                   | Valid http/https URL string    |
| `lineIndex`  | `number` | Index into the processed line array where this link appears | ≥ 0 |

---

### ProcessedLine
One rendered line of an email body after all transforms have been applied.

| Field    | Type                      | Description                                     |
|----------|---------------------------|-------------------------------------------------|
| `text`   | `string`                  | Display text of the line                        |
| `links`  | `LinkInfo[]`              | Links whose display text appears in this line (empty for plain lines) |

---

### BodyProcessingResult
Return type of the main pipeline function `processEmailBody`. Groups all data needed by `EmailPreview` to render the email body.

| Field        | Type             | Description                                              |
|--------------|------------------|----------------------------------------------------------|
| `lines`      | `ProcessedLine[]`| All processed lines ready for display                   |
| `allLinks`   | `LinkInfo[]`     | Flat list of all links across all lines (for Tab cycling) |

---

## State (Component-Level)

### URL Focus State (local to `EmailPreview`)
Not persisted; reset when a different email is selected.

| Field             | Type             | Description                                     |
|-------------------|------------------|-------------------------------------------------|
| `focusedLinkIndex`| `number \| null` | Index into `allLinks`; `null` = no URL focused |

---

## Transform Pipeline

```
Raw email body (bodyText or bodyHtml)
        │
        ▼
[1] HTML link extraction (HTML only)
    <a href="url">text</a> → [text](url) sentinel
        │
        ▼
[2] HTML tag stripping + entity decoding
    (plain text passthrough skips [1] and [2])
        │
        ▼
[3] Split on '\n' → string[]
        │
        ▼
[4] collapseBlankLines(lines)
    3+ consecutive blank → exactly 2 blank
        │
        ▼
[5] substituteLinks(lines, paneWidth)
    sentinels → LinkInfo; bare URLs detected + truncated
        │
        ▼
BodyProcessingResult { lines: ProcessedLine[], allLinks: LinkInfo[] }
```

---

## Validation Rules

- A `LinkInfo.displayText` after truncation MUST satisfy `displayText.length ≤ Math.floor(paneWidth / 2)`
- A line with zero links has `links: []` (never `undefined`)
- `allLinks` ordering matches document order (top-to-bottom, left-to-right)
- `focusedLinkIndex` is always clamped to `[0, allLinks.length - 1]`; if `allLinks` is empty, focus state is `null`
