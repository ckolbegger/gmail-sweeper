# Data Model: Email Detail Rendering Improvements

**Feature**: 003-glm-email-detail-rendering  
**Date**: 2026-02-28

## Entities

### URLReference

Represents a URL detected in email body content.

| Field         | Type    | Description                                    |
| ------------- | ------- | ---------------------------------------------- |
| `fullUrl`     | string  | The complete, unmodified URL                   |
| `displayText` | string  | Truncated text for display (≤ half pane width) |
| `startIndex`  | number  | Character position where URL starts in body    |
| `endIndex`    | number  | Character position where URL ends in body      |
| `isTruncated` | boolean | True if displayText was truncated              |

**Validation Rules**:

- `fullUrl` must match URL regex pattern
- `displayText` length ≤ `maxWidth` parameter
- `startIndex` < `endIndex`
- `isTruncated` = true when `getDisplayWidth(fullUrl) > maxWidth`

**Relationships**:

- Belongs to processed email body (1:N - body contains multiple URLs)

---

### ProcessedBody

Represents email body after text processing.

| Field           | Type           | Description                     |
| --------------- | -------------- | ------------------------------- |
| `originalText`  | string         | Raw email body text             |
| `processedText` | string         | Text with blank lines collapsed |
| `urls`          | URLReference[] | All URLs found in the body      |
| `urlCount`      | number         | Total number of URLs detected   |

**Validation Rules**:

- `processedText` has no sequences of 3+ blank lines
- `urlCount` = `urls.length`
- `processedText.length` ≤ `originalText.length`

**State Transitions**:

```
Raw Body → [Collapse Blank Lines] → [Detect URLs] → ProcessedBody
```

---

### URLCyclingState

Represents the current state of URL selection in the detail pane.

| Field           | Type           | Description                                      |
| --------------- | -------------- | ------------------------------------------------ |
| `selectedIndex` | number \| null | Index of currently highlighted URL, null if none |
| `urls`          | URLReference[] | URLs available for cycling                       |
| `statusMessage` | string \| null | Message to display in status line                |

**State Transitions**:

```
null → [Press u] → 0 → [Press u] → 1 → ... → [Press u] → 0 (wrap)
                                   → [Press Shift+u] → 0 (prev)
```

---

## Data Flow

```
Email.body.text
      │
      ▼
┌─────────────────────────────────┐
│  EmailContentProcessor.process() │
└─────────────────────────────────┘
      │
      ├──► ProcessedBody.processedText (collapsed blank lines)
      │
      └──► ProcessedBody.urls[] (URLReference array)
            │
            ▼
      ┌───────────────────┐
      │  EmailDetail (UI)  │
      └───────────────────┘
            │
            ├──► Display processedText
            │
            └──► Manage URLCyclingState
                  │
                  ├──► Highlight selectedUrl
                  │
                  └──► Show fullUrl in status line
```

---

## No Persistence Required

All entities are ephemeral (computed at render time, not stored):

- `ProcessedBody` is recalculated when email changes
- `URLCyclingState` is component state (React useState)
- No database schema changes needed
