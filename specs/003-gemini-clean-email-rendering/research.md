# Research: Clean Email Rendering

## 1. Transforming Email Content (Blank Lines and URLs)
**Decision**: Create a custom processing pipeline that runs after (or during) the `html-to-text` conversion to handle layout constraints and interactive link extraction.
**Rationale**: We need to extract the raw URLs and link text while simultaneously building a map of interactive links for the TUI. We also need to collapse consecutive blank lines. `html-to-text` can format links (e.g., `[text](url)`), but for a TUI we need to render the text and store the URL in a separate interactive state. We will use Regex or custom text parsing on the resulting plain text to collapse `


+` into `


` (which renders as 2 blank lines).
**Alternatives**: Trying to write a custom DOM parser for the HTML (too complex and brittle).

## 2. Opening URLs in Browser
**Decision**: Use the `open` npm package.
**Rationale**: It is the standard, cross-platform library in the Node.js ecosystem for opening URLs in the default web browser.
**Alternatives**: Using native `child_process.exec` with platform-specific commands (e.g., `xdg-open`, `open`, `start`), which is exactly what the `open` package abstracts away safely.

## 3. Copying to Clipboard
**Decision**: Use the `clipboardy` npm package.
**Rationale**: Standard cross-platform library for interacting with the system clipboard in Node.js.
**Alternatives**: Writing platform-specific clipboard commands via `child_process`, which is fragile.

## 4. TUI Interactivity (Focus, Scroll, and Highlight)
**Decision**: Implement a custom `LinkManager` hook or state within the `EmailDetail` component. It will parse the email body, replace links with highlighted text (Cyan) if focused, and track the list of links. The `useInput` hook will intercept `Tab` to cycle focus, `Enter` to call `open(url)`, and `c` to call `clipboardy.writeSync(url)`. Focus following scroll will be calculated based on the current scroll offset and the line numbers where links appear.
**Rationale**: Ink doesn't have a native "selectable text block" primitive that fits this exact need within a scrolling text view. We must manually track the cursor/scroll position relative to the discovered links.
**Alternatives**: Using a third-party Ink markdown renderer, but they typically don't support this specific interaction model (Tab cycling + follow scroll).
