# Bug: Long filter input breaks TUI layout

**Found by:** tui-exploratory-tester
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Exploratory testing — boundary conditions
**Severity:** major

## Steps to Reproduce

1. Start the app with `./gmail-sweep`
2. Press `f` to activate smart filter
3. Type a very long string (e.g., 100+ characters)

## Expected Behavior

The filter input field should either truncate, scroll, or wrap gracefully within its containing box without overwriting other UI elements or borders.

## Actual Behavior

The long text causes the `Smart Filter` input box to expand beyond its intended bounds, overwriting the right border and the line immediately below it in the terminal.

## Evidence

### Terminal Capture
```text
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Smart FilterThis is a very long filter description that I am typing to see how the TUI handles long inputs in the  │
 └─ ───────────smart filter box. It should ideally not break the layout or cause any weird rendering issues in the ───┘
               terminal.
```

## Relevant Files

- `src/components/Shared/FilterInput.tsx` — layout and width management

## Analysis

The `FilterInput` component uses a `Box` with `flexDirection="row"` but doesn't set a `maxWidth` or handle overflow for the `TextInput` component. Ink's layout engine attempts to fit the long string, causing it to push against and overwrite neighboring elements.
