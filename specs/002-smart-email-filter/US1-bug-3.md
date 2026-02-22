# Concern: Empty filter submission doesn't close input box

**Found by:** tui-exploratory-tester
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Exploratory testing — boundary conditions
**Severity:** minor

## Description

When the user activates the smart filter ('f'), types nothing (or only spaces), and presses Enter, the filter input box remains open.

While technically correct (the system "rejects" the empty filter by not applying it), it feels like a confusing interaction. Usually, pressing Enter in an empty input field is used to cancel or "do nothing and close".

## Evidence

### Terminal Capture
The `Smart Filter: ` input remains visible and focused after pressing Enter if the field is empty.

## Relevant Files

- `src/components/Shared/FilterInput.tsx` — `handleSubmit` logic
- `src/app.tsx` — `handleFilterSubmit` logic

## Recommendation

Consider closing the filter input box if Enter is pressed while it's empty, or providing feedback that a description is required.
