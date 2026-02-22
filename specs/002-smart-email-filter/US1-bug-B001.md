# Bug B001: Filter key press does not accept user input or send to LLM

**Found by:** User during manual testing
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Manual testing
**Severity:** critical

## Steps to Reproduce

1. Run the app: `npm run dev -- --account chris@kolbegger.com`
2. Press `f` to activate smart filter

## Expected Behavior

When the user presses `f`:

- A filter input prompt should appear with clear instruction: "Enter what kind of emails you want to find"
- User types a description (e.g., "invitation emails")
- User presses Enter
- The description is sent to the LLM to classify emails
- Filtered results are displayed

## Actual Behavior

The filter input flow is broken:

1. No prompt is shown to the user
2. No keyboard input is accepted
3. Even if input were accepted, it's not connected to the LLM

This is the core functionality of US1 - it is completely non-functional.

## Relevant Files

- `src/tui/app.tsx` — Main app component - needs to handle filter state
- `src/tui/hooks/useKeyboard.ts` — Keyboard handling including 'f' key
- `src/tui/hooks/useSmartFilter.ts` — Smart filter hook - activateFilter, submitFilter
- `src/tui/components/FilterInput.tsx` — Filter input component - needs to accept and submit input
