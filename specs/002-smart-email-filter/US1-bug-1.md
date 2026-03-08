# Bug: Empty filter description not rejected before AI config check

**Found by:** tui-exploratory-tester
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Exploratory testing — input boundary
**Severity:** major

## Steps to Reproduce

1. Start the app with `./gmail-sweep` (with NO AI provider configured)
2. Press `f` to activate smart filter
3. Press Enter immediately (empty description)
4. Observe the error message

## Expected Behavior

The system should reject the empty description with a message like "Filter description cannot be empty" (FR-013: System MUST reject empty filter descriptions and not apply a filter). This validation should happen BEFORE checking AI provider configuration.

## Actual Behavior

The system shows "AI provider not configured" instead of rejecting the empty input. The empty description check in `runSmartFilter()` (line 72: `if (!description.trim())`) never executes because `useSmartFilter.submitFilter()` checks the AI config first (lines 53-58) and returns early when config is null.

This also means whitespace-only descriptions (e.g., "   ") are not rejected — they also show "AI provider not configured".

## Evidence

### Terminal Capture (empty Enter submission)
```text
Gmail Inbox (50 emails)

AI provider not configured

>* New automated Squeeze Simpler Trading   today
 * Is the EU really goingGraph Atlas       today
 ...
```

### Terminal Capture (spaces-only submission)
```text
Gmail Inbox (50 emails)

AI provider not configured

>* New automated Squeeze Simpler Trading   today
 ...
```

## Relevant Files

- `src/tui/hooks/useSmartFilter.ts` — `submitFilter()` checks AI config before validating description (lines 48-58)
- `src/core/filter/smart-filter.ts` — `runSmartFilter()` has the correct empty check at line 72 but it's never reached

## Analysis

The fix is straightforward: add an empty/whitespace-only check at the beginning of `submitFilter()` before the `resolveAiConfig()` call:

```typescript
const submitFilter = useCallback(
  (description: string) => {
    if (!description.trim()) {
      setStatus('error');
      setError('Filter description cannot be empty');
      return;
    }
    // ... existing config check follows
  },
  [emails],
);
```

This ensures FR-013 is enforced regardless of AI provider configuration state.
