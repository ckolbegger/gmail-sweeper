# Research: Detail Pane Content Formatting

**Phase**: 0 — Research
**Feature**: 003-detail-content-format
**Date**: 2026-02-28

## Findings

### Decision 1: Text Processing Location
**Decision**: New module `src/core/text/body-formatter.ts` containing all pure transform functions.
**Rationale**: `EmailPreview.tsx` already mixes HTML conversion, layout, and rendering. Extracting all body-processing logic into a dedicated pure-function module enforces SRP (Constitution III), makes every transform independently unit-testable (Constitution II), and keeps the component focused on rendering.
**Alternatives considered**: Inline in `EmailPreview.tsx` (rejected — increases component complexity and untestability), new hook (rejected — hooks imply stateful/side-effectful logic; these are pure transforms).

---

### Decision 2: HTML Link Extraction Strategy
**Decision**: Modify the HTML processing pipeline to extract `<a href="url">text</a>` pairs before stripping all tags. Replace anchors with `[display text](full URL)` sentinel format inline; after HTML stripping, parse sentinels back into structured `LinkInfo` objects.
**Rationale**: The existing `htmlToText` strips all tags in one pass, discarding anchor text. The sentinel approach keeps the pipeline linear (one pass), avoids lookahead complexity, and preserves link text position within the resulting plain text.
**Alternatives considered**: DOM parsing (no DOM available in Node/TUI context), post-hoc URL detection in stripped text (loses link text), separate pre-pass storing anchor positions (fragile with nested tags).

---

### Decision 3: Plain-Text URL Detection
**Decision**: Regex-based detection of bare `http://` and `https://` URLs in plain-text bodies. No `mailto:` or other scheme processing in the initial pass (deferred per spec assumptions).
**Rationale**: Plain-text emails have no anchor elements; only raw URLs exist. A standard URL regex (`https?://[^\s<>"]+`) is sufficient and has no external dependencies. Per clarification Q1, no substitution is attempted — only truncation.
**Alternatives considered**: Full RFC-3986 URI parser (overkill, no dependency budget for it), `URL` constructor validation (useful for sanitisation but not detection).

---

### Decision 4: URL Truncation — Half-Width Calculation
**Decision**: `truncateToHalfWidth(text, paneWidth)` truncates to `Math.floor(paneWidth / 2)` characters, replacing the tail with `…` (single Unicode ellipsis character, 1 column wide).
**Rationale**: The spec says "never longer than half of the detail window." The detail pane receives its width as a prop already. The `paneWidth` is measured in terminal columns. Using a Unicode ellipsis (U+2026) is conventional and takes 1 column, keeping the truncated text within the target width.
**Alternatives considered**: Word-boundary truncation (complicates the function, URLs have no natural word breaks), `...` three dots (3 characters vs 1, wastes width budget), percentage-based (same result since we receive absolute width).

---

### Decision 5: URL Focus & Keyboard Interaction (P3)
**Decision**: Manage focused URL index as local state in `EmailPreview`. Use Ink's `useInput` scoped to the preview component. Tab cycles forward, Shift-Tab backward through `LinkInfo` objects extracted from the current email. `c` copies, `o` opens. No new hook required.
**Rationale**: URL navigation is purely local to the preview pane — it doesn't affect the email list or global selection state. Using component-local `useState` + `useInput` is the simplest compliant approach (Constitution V). The existing `useKeyboard` hook owns list navigation; adding URL focus there would mix concerns (Constitution III).
**Alternatives considered**: New `useUrlNavigation` hook (overkill for local state), extending `useKeyboard` (mixes list and body-navigation concerns), modal overlay (unnecessary complexity).

---

### Decision 6: Pane Width Availability
**Decision**: The `paneWidth` is passed as a new optional prop to `EmailPreview`. The calling code (`app.tsx`) already computes layout dimensions. Defaulting to 80 columns when not provided.
**Rationale**: `EmailPreview` currently receives `maxHeight` but not width. Adding `paneWidth` as a prop follows the existing pattern and keeps width computation in the layout layer, not the content layer.
**Alternatives considered**: `process.stdout.columns` inside component (breaks during testing, couples component to environment), fixed width constant (fails SC-004 — no responsive truncation).

---

### No NEEDS CLARIFICATION items remain.
