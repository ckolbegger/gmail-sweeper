# Bug: Pressing Enter in Filter Input Does Not Submit Smart Filter

**Found by:** tui-acceptance-tester  
**Target:** US1 — Filter Inbox by Natural Language Description  
**Scenario:** #1/#2/#3 — Activate smart filter, type description, press Enter  
**Severity:** major

## Steps to Reproduce

1. Start the app with `./gmail-sweep`.
2. Press `f` to activate smart filter input mode.
3. Type `emails with invitations to an event`.
4. Press `Enter`.
5. Wait up to 12 seconds.

## Expected Behavior

- Submitting with Enter should start evaluation (or immediately error if config is missing).
- UI should leave plain input mode and show either:
  - loading state (`Evaluating smart filter...`), or
  - filtered result state (`Filtered: X/Y emails`), or
  - a visible error state.

## Actual Behavior

- Nothing happens after pressing Enter.
- UI remains in input mode showing:
  - `Enter smart filter description and press Enter.`
  - `Filter: emails with invitations to an event`
  - `Enter to apply, Esc to clear`
- Poll timed out (`SUBMIT_STATE_AT:timeout`) with no state transition.

## Evidence

### Terminal Capture (after pressing Enter and waiting)
```text
SUBMIT_STATE_AT:timeout
Mode: list
Enter smart filter description and press Enter.
Filter: emails with invitations to an event
Enter to apply, Esc to clear
```

### Additional Repro (no-match phrase also does not submit)
```text
NO_MATCH_STATE_AT:1
Mode: list
Enter smart filter description and press Enter.
Filter: zzzz definitely no matches 12345
Enter to apply, Esc to clear
```

## Relevant Files

- `src/tui/app.ts`
- `src/tui/input_controller.ts`

## Analysis

In real Ink input events, Enter may provide both a command (`open`) and non-empty raw input (`\\r`/`\\n`). The current filter-input handling prioritizes non-empty `rawInput` appending before processing `open`, so Enter can be treated as text input instead of submit.
