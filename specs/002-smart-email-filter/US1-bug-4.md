# Bug: Email list clears immediately during filter evaluation

**Found by:** User Report
**Target:** US1 — Filter Inbox by Natural Language Description
**Severity:** Major

## Steps to Reproduce

1. Start the app with `./gmail-sweep`
2. Press `f` to activate smart filter
3. Type a query (e.g., "receipts") and press Enter
4. Observe the email list immediately after pressing Enter

## Expected Behavior

The full email list should remain visible while the AI is processing the request. To indicate that work is happening:
1. The list text should be **dimmed**.
2. The user should still be able to navigate the list (it remains active).
3. The list should only update/filter once the AI results are returned.

## Actual Behavior

The email list clears immediately (showing "No emails found" or an empty list) as soon as the filter is submitted. It remains empty for several seconds until the AI response arrives, causing a jarring "flash" of empty content.

## Relevant Files

- `src/app.tsx` — logic for `displayEmails`
- `src/components/Inbox/InboxList.tsx` — rendering logic (needs `dimmed` prop)

## Analysis

The `displayEmails` `useMemo` hook in `App.tsx` likely attempts to filter based on `filterResults`. When a new filter starts (`status === 'loading'`), `filterResults` is reset to empty, causing the derived `displayEmails` list to become empty immediately.

## Suggested Fix

1. **Update `App.tsx`**: Modify `displayEmails` to return the full `emails` list when `filterStatus === 'loading'`, instead of trying to filter against an empty result set.
2. **Update `InboxList.tsx`**: Add a `dimmed` boolean prop. When true, render the email text colors using a dimmer style (e.g., `gray` or `dimColor`).
3. **Pass Prop**: Pass `dimmed={filterStatus === 'loading'}` to `InboxList`.
