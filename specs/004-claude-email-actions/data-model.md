# Data Model: Email Action Keys

**Feature**: 004-claude-email-actions | **Date**: 2026-03-01

---

## No New Entities

This feature adds no new data entities. All operations act on the existing `Email` entity via its `id` field.

---

## State Additions

### In `useGmail`

New callbacks exposed from the hook:

| Field | Type | Description |
|-------|------|-------------|
| `removeEmail` | `(id: string) => void` | Optimistically removes an email from the in-memory list |
| `restoreEmail` | `(email: Email, index: number) => void` | Restores a previously removed email at its original index (rollback) |

### In `useEmailActions` (new hook)

| Field | Type | Description |
|-------|------|-------------|
| `inFlightIds` | `Set<string>` (internal state) | IDs of emails currently being actioned; blocks duplicate presses |
| `actionError` | `string \| null` | Human-readable error message if the last action failed; null when none |

### In `useKeyboard`

New callbacks accepted as options:

| Field | Type | Description |
|-------|------|-------------|
| `onArchive` | `((emailId: string) => void) \| undefined` | Called when user presses `e` with a non-empty list |
| `onDelete` | `((emailId: string) => void) \| undefined` | Called when user presses `#` with a non-empty list |

---

## State Transitions

### Email lifecycle (in-memory list)

```
Present in list
  │
  ├─ user presses 'e' or '#'
  │     └─► Removed immediately (optimistic)
  │           ├─ API succeeds → stays removed ✓
  │           └─ API fails   → Restored at original index + actionError set
  │
  └─ no action → remains in list
```

### Action error lifecycle

```
null (idle)
  └─► string (error occurred)
        └─► null (auto-cleared after 4 seconds, or next successful action)
```
