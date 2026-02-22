# Bug: Escape key exits app instead of clearing active filter

**Found by:** tui-exploratory-tester
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Exploratory testing — state transitions
**Severity:** critical

## Steps to Reproduce

1. Start the app with `./gmail-sweep`
2. Apply any filter (e.g., press `f`, type `receipts`, press `Enter`)
3. Once the filter is applied (or an error is shown), press `Escape`

## Expected Behavior

The active filter should be cleared, the filter results removed, and the full inbox list restored (User Story 2).

## Actual Behavior

The application exits immediately to the terminal.

## Evidence

### Terminal Capture (after pressing Escape in error state)
```text
  Error: AI Provider not initialized
 ...
 +--------------------------------------------------------------------------------------------------------------------+
 |  [Arrows] Navigate  [Enter] View  [f] Filter  [Esc] Exit                                                           |
 +--------------------------------------------------------------------------------------------------------------------+

~/src/gmail-sweep/worktrees/gemini 002-gemini-email-smart-filtering* ⇡ 44s
❯
```

## Relevant Files

- `src/app.tsx` — `useInput` hook logic for `key.escape`

## Analysis

The `useInput` hook in `App.tsx` is currently wired to call `process.exit(0)` if `selectedEmail` is null and `key.escape` is pressed. It does not check if a filter is active (`filterStatus !== 'idle'`) to clear it instead of exiting. This directly contradicts User Story 2.
