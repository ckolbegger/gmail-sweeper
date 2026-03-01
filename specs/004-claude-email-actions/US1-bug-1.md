# Bug: Archived/Deleted Emails Reappear After Restart

**Feature**: 004-claude-email-actions
**Story**: US1 (archive) / US2 (delete)
**Severity**: High — action appears to work but has no persistence

## Symptom

Pressing `e` (archive) or `#` (delete) removes the email from the visible list. But after closing and reopening the app, the email reappears as if no action was taken.

## Root Cause

`useEmailActions` performs two operations on success:
1. Calls `onRemove(id)` → removes email from **React state** (in-memory only)
2. Calls `client.archive([id])` / `client.trash([id])` → updates **Gmail server**

It never updates the **local SQLite cache** (`EmailCache`). On startup, `useGmail` loads emails from the cache first (`cache.getEmails()`). Since the cache still contains the actioned email, it reappears in the list.

## Affected Code

- `src/tui/hooks/useEmailActions.ts` — success branch does not call cache removal
- `src/core/cache/db.ts` — `EmailCache` has no `removeEmail` method

## Fix

1. **`src/core/cache/db.ts`**: Add `removeEmail(id: string): void` — DELETE from SQLite + save
2. **`src/tui/hooks/useEmailActions.ts`**: Add `onPersistRemove?: (id: string) => void` option; call it after a successful API call (not on failure)
3. **`src/tui/app.tsx`**: Pass `onPersistRemove: (id) => cache.removeEmail(id)` to `useEmailActions`

## Acceptance Criteria

1. After pressing `e` or `#`, close and reopen the app — the actioned email must not appear in the list
2. If the API call fails, the cache is unchanged and the email is restored in the list (existing revert behavior preserved)
3. All existing tests continue to pass
