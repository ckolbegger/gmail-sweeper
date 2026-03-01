# Research: Email Detail Rendering Improvements

**Feature**: 003-glm-email-detail-rendering  
**Date**: 2026-02-28

## Research Questions

### 1. Blank Line Collapsing Algorithm

**Decision**: Collapse 3+ consecutive blank lines to exactly 2.

**Rationale**:

- Simple regex-based approach: `/\n{3,}/g` → `"\n\n"`
- Preserves intentional paragraph breaks (1-2 blank lines)
- Minimal computational overhead

**Alternatives Considered**:

- Collapse to 1 blank line: Rejected - loses visual paragraph separation
- Configurable threshold: Rejected - YAGNI, adds unnecessary complexity

**Implementation**:

```typescript
function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n');
}
```

---

### 2. URL Detection Pattern

**Decision**: Use regex pattern for common URL schemes with word boundary awareness.

**Rationale**:

- Standard URL regex covers 99% of email URLs
- Must handle: `http://`, `https://`, `www.` (without scheme)
- Must NOT match: email addresses, file paths, version numbers

**Pattern**:

```typescript
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>(){}[\]"']+/gi;
```

**Alternatives Considered**:

- `URL` constructor parsing: Rejected - throws on invalid URLs, need try/catch
- Third-party library (linkify): Rejected - adds dependency for simple use case

**Edge Cases**:

- URLs at end of sentence: `https://example.com.` - strip trailing punctuation
- URLs in parentheses: `(https://example.com)` - handle gracefully
- URLs with query params: preserve full URL for copying

---

### 3. URL Display Truncation

**Decision**: Truncate to half pane width using ellipsis in middle.

**Rationale**:

- Middle truncation preserves both domain and path context
- Format: `https://example.com/.../endpoint`
- Display width must account for Unicode/emoji (use existing `charDisplayWidth` pattern)

**Alternatives Considered**:

- End truncation: Rejected - loses path context
- Start truncation: Rejected - loses domain (most important part)
- No truncation indicator: Rejected - user can't tell URL was shortened

**Implementation**:

```typescript
function truncateUrl(url: string, maxWidth: number): string {
  if (getDisplayWidth(url) <= maxWidth) return url;
  const ellipsis = '…';
  const targetWidth = maxWidth - getDisplayWidth(ellipsis);
  const startLen = Math.floor(targetWidth * 0.6); // 60% domain
  const endLen = targetWidth - startLen;
  return url.slice(0, startLen) + ellipsis + url.slice(-endLen);
}
```

---

### 4. URL Interaction Mechanism

**Decision**: Keyboard shortcut (Tab or `u`) cycles through URLs, status line shows full URL.

**Rationale**:

- Consistent with existing keyboard patterns in app (`useKeyboard` hook)
- No mouse dependency (terminal-focused UX)
- Status line provides full URL visibility without popup/overlay complexity

**Alternatives Considered**:

- Numbered URL indices `[1]`: Rejected - clutters display, harder to implement
- Clickable URLs: Rejected - requires terminal mouse support, not universal
- Modal popup: Rejected - breaks flow, adds complexity

**Shortcuts**:
| Key | Action |
|-----|--------|
| `u` | Cycle to next URL (or Tab if preferred) |
| `Shift+u` | Cycle to previous URL |
| `c` | Copy highlighted URL to clipboard |
| `o` | Open highlighted URL in browser |

---

### 5. Clipboard Integration

**Decision**: Add `clipboardy` package for cross-platform clipboard support.

**Rationale**:

- `clipboardy` is the standard Node.js clipboard library
- Cross-platform: macOS (pbcopy), Linux (xclip/wl-copy), Windows (clip)
- Simple API: `await clipboard.write(text)`

**Alternatives Considered**:

- Native shell commands: Rejected - platform-specific, error-prone
- `node-clipboardy`: Same as clipboardy, different name
- No clipboard support: Rejected - user explicitly requested this feature

**Implementation**:

```typescript
import clipboard from 'clipboardy';
await clipboard.write(url);
```

---

### 6. Browser Opening

**Decision**: Use existing `open` package (already in dependencies).

**Rationale**:

- Already installed in package.json (`"open": "^10.1.0"`)
- Cross-platform: macOS (`open`), Linux (`xdg-open`), Windows (`start`)
- Simple API: `await open(url)`

**Implementation**:

```typescript
import open from 'open';
await open(url);
```

---

### 7. HTML Anchor Text Extraction

**Decision**: Extract link text from HTML anchors before plain text conversion.

**Rationale**:

- Email HTML often has `<a href="long-url">Click here</a>`
- Displaying "Click here" is more readable than the URL
- Must work with existing HTML-to-text conversion

**Implementation Note**:
The existing `parseGmailMessage` in `src/core/models/email.ts` extracts `body.text` from Gmail API. URL detection happens on the plain text output. For HTML emails, anchor text is already extracted during Gmail's text conversion.

**Edge Case**: If HTML has `<a href="url">url</a>` (URL as both href and text), display the URL (truncated).

---

## Integration Points

### Existing Code to Modify

| File                                  | Change                                              |
| ------------------------------------- | --------------------------------------------------- |
| `src/cli/components/email-detail.tsx` | Add URL state, integrate processor, add status line |
| `src/cli/app.tsx`                     | Register URL cycling shortcuts (or in EmailDetail)  |

### New Code to Create

| File                                              | Purpose                                         |
| ------------------------------------------------- | ----------------------------------------------- |
| `src/core/services/email-content-processor.ts`    | Blank line collapse, URL extraction, truncation |
| `tests/unit/core/email-content-processor.test.ts` | Unit tests for processor                        |

### Dependencies to Add

| Package      | Version | Purpose                  |
| ------------ | ------- | ------------------------ |
| `clipboardy` | ^4.0.0  | Cross-platform clipboard |

---

## Risks & Mitigations

| Risk                            | Mitigation                                     |
| ------------------------------- | ---------------------------------------------- |
| False positive URL detection    | Conservative regex, unit tests with edge cases |
| Unicode display width issues    | Reuse existing `charDisplayWidth` pattern      |
| Clipboard fails in headless env | Graceful fallback with error message           |
| Browser open fails              | Graceful fallback with error message           |
