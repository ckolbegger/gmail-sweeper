# Data Model: Clean Email Rendering

This feature primarily deals with view-state models rather than persistent database entities.

## Entities

### `RenderedLink`
Represents an interactive hyperlink extracted from the email body.

**Fields**:
- `id` (string): Unique identifier for the link within the email (e.g., `link-0`, `link-1`).
- `text` (string): The display text for the link. MUST be constrained to <= 50% of the detail pane width.
- `url` (string): The full destination URL.
- `lineIndex` (number): The line number within the rendered text where this link appears (used for calculating "focus follows scroll").

### `ParsedEmailBody`
The result of processing the raw email content for display.

**Fields**:
- `content` (string): The text to display, with >2 consecutive blank lines collapsed, and long URLs replaced by truncated/link text.
- `links` (RenderedLink[]): Array of interactive links discovered in the text.

## State Transitions
- **Focus State**: A `RenderedLink` becomes "focused" either automatically when its `lineIndex` is closest to the top of the visible scroll area, or manually when the user presses `Tab`.
- **Interaction**:
  - Focused + `Enter` -> Triggers OS browser open action.
  - Focused + `c` -> Triggers OS clipboard copy action.
