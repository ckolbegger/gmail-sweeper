# Quickstart: Email Action Keys

**Feature**: 004-claude-email-actions | **Date**: 2026-03-01

---

## What's Being Built

Two keyboard shortcuts for the inbox TUI:

| Key | Action | Scope |
|-----|--------|-------|
| `e` | Archive highlighted email (removes INBOX label) | List view + preview pane |
| `#` | Delete highlighted email (move to Trash) | List view + preview pane |

Both keys act on whichever email is currently highlighted in the list (and simultaneously shown in the preview pane). No confirmation required.

---

## Files Touched

| File | Change |
|------|--------|
| `src/tui/hooks/useEmailActions.ts` | **CREATE** — new hook |
| `src/tui/hooks/useGmail.ts` | **MODIFY** — add `removeEmail`, `restoreEmail` |
| `src/tui/hooks/useKeyboard.ts` | **MODIFY** — add `onArchive`/`onDelete`, handle `e`/`#` |
| `src/tui/app.tsx` | **MODIFY** — wire hooks, show `actionError` in footer |

---

## TDD Order

```
1. useGmail: removeEmail unit tests
2. useGmail: restoreEmail unit tests
3. useEmailActions: archive happy-path unit test (mock client)
4. useEmailActions: archive failure + revert unit test
5. useEmailActions: delete happy-path unit test
6. useEmailActions: delete failure + revert unit test
7. useEmailActions: in-flight guard unit test
8. useKeyboard: 'e' key dispatches onArchive
9. useKeyboard: '#' key dispatches onDelete
10. useKeyboard: no-op when list empty
11. Integration: app renders, press 'e', email removed from list
12. Integration: app renders, press '#', email removed from list
13. Integration: archive fails → email restored + error shown
```

---

## Verifying the Feature

```bash
# Run all tests
npm test

# Run TUI in dev mode (requires Google auth)
npx ts-node src/cli/index.ts

# Press 'e' on a highlighted email → it disappears from list
# Press '#' on a highlighted email → it disappears from list
# Ctrl+R to refresh → archived/deleted emails remain absent
```

---

## Key Design Choices (see research.md for rationale)

- **No `EmailPreview` handler** — both views share the same `useKeyboard` handler; no double-fire risk.
- **Optimistic UI** — email removed before API call; restored on failure.
- **`#` key** — arrives as `input === '#'` in Ink's `useInput`; no shift-key special handling.
- **Footer error** — transient red text in footer, auto-clears after 4 s.
