# Implementation Plan: Email Action Keys

**Branch**: `004-minimax-email-action-keys` | **Date**: 2026-03-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-minimax-email-action-keys/spec.md`

## Summary

Add two keyboard shortcuts to the TUI for quick email management: 'e' archives the selected email and removes it from the displayed list, while '#' moves the email to trash (with confirmation prompt). Both shortcuts work in both list view and email detail view.

## Technical Context

**Language/Version**: TypeScript 5.4 (strict mode, ES2022 target, ESM)
**Primary Dependencies**: Ink 4.0 (TUI), googleapis 130 (Gmail)
**Storage**: sql.js 1.8 (SQLite email cache) — no new storage needed
**Testing**: Vitest 1.0, ink-testing-library, @testing-library/react
**Target Platform**: Node.js ≥20, terminal (TUI)
**Project Type**: Single project
**Performance Goals**: Archive/delete completes within 500ms UI response (SC-001, SC-002)
**Constraints**: Confirmation required for delete per Constitution Safety principle
**Scale/Scope**: Single email operations, local state update

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                 | Status | Notes                                                                                                                    |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| I. Safety & Security      | PASS   | Delete action requires confirmation (y/n prompt). Archive is non-destructive (removes from INBOX only).                  |
| II. Strict TDD            | PASS   | All components will be test-first. Unit tests for keyboard handler, integration tests for Gmail operations.              |
| III. Modular Architecture | PASS   | Changes isolated to useKeyboard hook, new useEmailActions hook for archive/delete logic, UI components for confirmation. |
| IV. CLI Excellence        | PASS   | Vim-style shortcuts (e, #), clear confirmation prompt, standard error handling.                                          |
| V. Simplicity & YAGNI     | PASS   | Only implementing 'e' (archive) and '#' (delete). No batch operations, no undo feature.                                  |

**Post-Phase 1 Re-check**: Design maintains all passes.

## Project Structure

### Documentation (this feature)

```text
specs/004-minimax-email-action-keys/
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: development guide
├── contracts/           # Phase 1: TypeScript interfaces
│   └── email-actions.ts # Email action types and contracts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── gmail/client.ts       # EXISTING: has archive() and trash() methods
│   └── models/index.ts        # MODIFY: add ActionResult type
├── tui/
│   ├── hooks/
│   │   ├── useKeyboard.ts    # MODIFY: add 'e' and '#' key handlers
│   │   └── useEmailActions.ts # NEW: archive/delete logic + confirmation state
│   └── components/
│       └── ConfirmationPrompt.tsx # NEW: y/n confirmation component
│   └── app.tsx               # MODIFY: integrate useEmailActions
└── cli/index.ts              # EXISTING: unchanged

tests/
├── unit/
│   ├── tui/
│   │   ├── useEmailActions.test.ts # NEW: action logic tests
│   │   └── useKeyboard.test.ts    # MODIFY: add action key tests
│   └── gmail/
│       └── client.test.ts     # MODIFY: add archive/trash tests (existing)
└── integration/
    └── email-actions.test.ts  # NEW: full action flow tests
```

**Structure Decision**: Extends existing single-project structure. New `useEmailActions` hook follows the established pattern of `useGmail` and `useSmartFilter`. Confirmation prompt component isolated for testability.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
