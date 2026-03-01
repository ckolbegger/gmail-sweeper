# Hook Contracts: Email Action Keys

**Feature**: 004-claude-email-actions | **Date**: 2026-03-01

> This feature is a TUI hook-based architecture. Contracts are expressed as TypeScript interfaces, not HTTP endpoints.

---

## `useEmailActions` (new hook)

**File**: `src/tui/hooks/useEmailActions.ts`

**Purpose**: Encapsulates optimistic archive/delete operations. Owns the in-flight guard and action error state.

```ts
interface UseEmailActionsOptions {
  client: GmailClient | undefined;
  // Reference to the emails currently displayed (used for optimistic index lookup)
  emails: Email[];
  onRemove: (id: string) => void;
  onRestore: (email: Email, index: number) => void;
}

interface UseEmailActionsResult {
  archive: (emailId: string) => void;
  delete: (emailId: string) => void;
  actionError: string | null;
  clearActionError: () => void;
  isInFlight: (emailId: string) => boolean;
}

function useEmailActions(options: UseEmailActionsOptions): UseEmailActionsResult
```

**Behaviour contract**:
- `archive(id)` and `delete(id)` are fire-and-forget. They return `void` synchronously (not a Promise) so callers need no async handling.
- If `id` is already in-flight, the call is silently ignored.
- Optimistic removal (`onRemove`) is called synchronously before the API call.
- On API failure, `onRestore` is called with the email object and its original index, then `actionError` is set.
- `actionError` is auto-cleared after 4 000 ms (managed inside the hook via `useEffect`/`setTimeout`).

---

## `useGmail` additions

**File**: `src/tui/hooks/useGmail.ts`

Two new fields added to `UseGmailResult`:

```ts
interface UseGmailResult {
  // ... existing fields unchanged ...
  removeEmail: (id: string) => void;
  restoreEmail: (email: Email, index: number) => void;
}
```

---

## `useKeyboard` additions

**File**: `src/tui/hooks/useKeyboard.ts`

Two new optional callbacks added to `UseKeyboardOptions`:

```ts
interface UseKeyboardOptions {
  // ... existing fields unchanged ...
  onArchive?: (emailId: string) => void;
  onDelete?: (emailId: string) => void;
}
```

**Key mapping**:
| Key | Condition | Action |
|-----|-----------|--------|
| `e` | `itemCount > 0` and filter input not active | `onArchive?.(currentEmailId)` |
| `#` | `itemCount > 0` and filter input not active | `onDelete?.(currentEmailId)` |

`currentEmailId` is derived from the current `selectedIndex` — `useKeyboard` needs the `emails` (or just the selected email ID) passed in, or it receives `onArchive`/`onDelete` from `app.tsx` which already has `selectedEmail`.

> **Implementation note**: `app.tsx` already has `selectedEmail = displayEmails[keyboard.selectedIndex]`. The cleanest approach is for `app.tsx` to pass lambdas: `onArchive={() => actions.archive(selectedEmail.id)}`. No ID threading into `useKeyboard` required.

---

## `app.tsx` changes (wiring)

```ts
const { removeEmail, restoreEmail, ...gmailState } = useGmail({ ... });

const actions = useEmailActions({
  client,
  emails: displayEmails,
  onRemove: removeEmail,
  onRestore: restoreEmail,
});

const keyboard = useKeyboard({
  ...
  onArchive: selectedEmail ? () => actions.archive(selectedEmail.id) : undefined,
  onDelete:  selectedEmail ? () => actions.delete(selectedEmail.id)  : undefined,
});

// In JSX footer:
{actions.actionError && (
  <Text color="red">⚠ {actions.actionError}</Text>
)}
```
