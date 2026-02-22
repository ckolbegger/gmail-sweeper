# Bug: Filter Input Mode Interprets Global Command Keys as Commands

**Found by:** tui-exploratory-tester  
**Target:** US1 — Filter Inbox by Natural Language Description  
**Discovery:** Exploratory testing — input boundary / rapid interaction  
**Severity:** major

## Steps to Reproduce

1. Start the app and open smart filter input with `f`.
2. While in filter input mode, type `q`.
3. Repeat with `j`, `k`, or `f` while input mode is active.

## Expected Behavior

- Typed characters should be appended to the filter draft text.
- Global list commands should be disabled while text input is active.
- `q` should not quit from filter input text entry.

## Actual Behavior

- `q` triggers quit (`shouldExit=true`).
- `j`/`k` move list selection instead of being entered as text.
- `f` resets/restarts filter input and clears current draft.

## Evidence

### Repro Output (typed `q` in filter input)

```text
status= input shouldExit= true draft= ""
```

### Repro Output (typed `j` in filter input)

```text
selected_before= 0 selected_after= 1 draft= ""
```

### Repro Output (typed `f` in filter input after drafting text)

```text
draft_after_second_f= "" status= input
```

## Relevant Files

- `src/tui/input_controller.ts`
- `src/tui/app.ts`

## Analysis

`mapInputToCommand()` currently maps command letters globally before input-mode context is considered. The app then processes those commands even while smart filter input is active, causing control-key collisions with normal typing.
