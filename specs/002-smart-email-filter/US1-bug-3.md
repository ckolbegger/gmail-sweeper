# Bug: Selection index not reset when switching between filtered and unfiltered views

**Found by:** code review
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Code review — state transition analysis
**Severity:** major

## Steps to Reproduce

1. Start the app with `./gmail-sweep`
2. Navigate down to email #30 using j/k
3. Press `f`, type a filter description, press Enter
4. Filter returns 3 matching emails
5. Observe the email list and preview pane

## Expected Behavior

Selection resets to the first filtered email (index 0). The preview pane shows the first matching email.

## Actual Behavior

`keyboard.selectedIndex` is still 30 from the unfiltered view. `displayEmails[30]` is `undefined` (only 3 results). The preview pane shows nothing or crashes. Navigation works after the first keypress (because `clampIndex` bounds it), but the initial render after filtering is broken.

Same issue occurs in reverse: clearing a filter when the filtered selection index exceeds the unfiltered list length.

## Relevant Files

- `src/tui/hooks/useKeyboard.ts` — `useState(selectedIndex)` at line 35 only sets initial value on mount; no effect resets index when `itemCount` changes
- `src/tui/app.tsx` — passes `displayEmails.length` as `itemCount` but `useKeyboard` ignores the change internally

## Analysis

Add a `useEffect` in `useKeyboard` that resets the index to 0 (or clamps it) when `itemCount` changes. This ensures the selection is always valid when the displayed list changes.

```typescript
useEffect(() => {
  setIndex(prev => Math.min(prev, Math.max(0, itemCount - 1)));
}, [itemCount]);
```
