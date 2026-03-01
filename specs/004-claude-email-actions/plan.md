# Implementation Plan: Email Action Keys — Archive & Delete

**Branch**: `004-claude-email-actions` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)

## Summary

Add `e` (archive) and `#` (delete/trash) keyboard shortcuts to the TUI. Both keys are handled centrally in `useKeyboard`. They trigger optimistic removal from the in-memory email list, followed by an async Gmail API call. On failure the email is restored and a transient error message is displayed. `GmailClient.archive()` and `GmailClient.trash()` already exist — no new API primitives needed.

## Technical Context

**Language/Version**: TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`)
**Primary Dependencies**: Ink 4.0, React 18, ink-testing-library 3.0, googleapis 130
**Storage**: N/A — email list is in-memory React state; Gmail API is the source of truth
**Testing**: Vitest + ink-testing-library 3.0 (unit/component); Vitest with mocked GmailClient (integration)
**Target Platform**: Linux/macOS terminal (Ink TUI)
**Project Type**: Single project
**Performance Goals**: Optimistic UI update within one render frame; API call fire-and-forget (no blocking)
**Constraints**: No confirmation dialog; in-flight guard per email ID; revert on failure
**Scale/Scope**: Single-user TUI; one action at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security — destructive actions require explicit confirmation | ⚠️ JUSTIFIED DEVIATION | See Complexity Tracking |
| II. TDD — no production code without a failing test | ✅ PASS | Plan enforces test-first order |
| III. Modular Architecture — single responsibility per module | ✅ PASS | New `useEmailActions` hook isolates action logic |
| IV. CLI Excellence — clear error reporting | ✅ PASS | Transient error shown in footer |
| V. Simplicity / YAGNI | ✅ PASS | No new entities, no new API methods, no confirmation modal |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution I: destructive action without y/n prompt | Spec explicitly requires single-key-press UX, matching Gmail keyboard shortcut conventions (`e` / `#`). The deliberate key press in an interactive TUI constitutes explicit user intent — equivalent to Gmail's keyboard-shortcut UX with no additional prompt. | A y/n prompt would require a new modal/overlay component and significantly changes the UX contract requested by the user. Batch operations remain out of scope here. |

## Project Structure

### Documentation (this feature)

```text
specs/004-claude-email-actions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── hooks.md
└── tasks.md             # Phase 2 output (not created here)
```

### Source Code (repository root)

```text
src/
  tui/
    app.tsx                           # modified — wire useEmailActions, show actionError
    components/
      EmailList.tsx                   # no change
      EmailPreview.tsx                # no change (detail view is the split-pane preview)
    hooks/
      useGmail.ts                     # modified — add removeEmail()
      useKeyboard.ts                  # modified — add onArchive/onDelete + e/# handling
      useEmailActions.ts              # NEW — optimistic update + API call + error state

tests/
  unit/
    tui/
      useEmailActions.test.ts         # NEW — unit tests for action hook (mocked client)
      useKeyboard.actions.test.ts     # NEW — key 'e' and '#' dispatch tests
  integration/
    email-actions.test.ts             # NEW — end-to-end: key → removal → API call
```

**Structure Decision**: Single project, Option 1. New hook goes in `src/tui/hooks/` alongside existing `useGmail` and `useKeyboard`. No new top-level directories.

---

## Phase 0: Research

*Artifacts: [research.md](./research.md)*

### Unknowns

1. Whether `EmailPreview` needs its own `e`/`#` handler or whether the centralized `useKeyboard` handler suffices.
2. How to show transient error messages in the Ink TUI without a blocking modal.
3. Whether the `#` character reaches `useInput` correctly (it requires Shift+3 on most keyboards).

---

## Phase 1: Design & Contracts

*Artifacts: [data-model.md](./data-model.md), [contracts/hooks.md](./contracts/hooks.md), [quickstart.md](./quickstart.md)*

### Architecture Decision: No Separate Detail-View Handler

The spec references "list view" and "detail view" as two contexts, but in the current implementation they are always rendered simultaneously in a split pane. There is exactly one selected email at any time. Therefore:

- `e` / `#` are handled in **one place only**: `useKeyboard`.
- `EmailPreview` does **not** get its own `e`/`#` handler — this avoids double-firing and keeps input handling centralized.
- US3 (actions from "detail view") is satisfied by the same handler as US1/US2.

### Data Flow

```
User presses 'e' or '#'
  └─► useKeyboard (useInput)
        └─► calls onArchive(emailId) / onDelete(emailId)
              └─► useEmailActions.archive/delete
                    ├─ optimistic: calls removeEmail(id) in useGmail → re-renders list
                    └─ async:  client.archive([id]) / client.trash([id])
                          ├─ success: noop (email already removed)
                          └─ failure: restore email to list + set actionError
```

### Transient Error Display

Action errors are surfaced via `actionError: string | null` from `useEmailActions`. `app.tsx` renders this in a dismissible line in the footer area (auto-clears after 5 seconds via `setTimeout`).
