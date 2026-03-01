# Research: Email Action Keys

**Feature**: Email Action Keys (004-minimax-email-action-keys)
**Date**: 2026-03-01

## Decisions Made

### Decision 1: Archive Action Implementation

**What was chosen**: Use existing `GmailClient.archive()` method which removes INBOX label.

**Rationale**: The Gmail client already implements archive by removing the INBOX label. This is the standard Gmail archive behavior. The method returns a `BatchResult` with succeeded/failed arrays.

**Alternatives considered**:

- Creating a new archive method — rejected, already exists
- Moving to "All Mail" label — rejected, same effect as INBOX removal but more complex

---

### Decision 2: Delete Action Implementation

**What was chosen**: Use existing `GmailClient.trash()` method with user confirmation.

**Rationale**: The Gmail client already implements trash. The Constitution requires confirmation for destructive actions, so a y/n prompt is needed before calling trash().

**Alternatives considered**:

- Permanent delete (bypass trash) — rejected, too dangerous
- Skip confirmation for speed — rejected, violates Constitution Principle I

---

### Decision 3: UI State Management

**What was chosen**: New `useEmailActions` hook that manages action state and updates parent email list.

**Rationale**: Following the existing pattern of `useGmail` and `useSmartFilter` hooks. The hook will expose `archiveEmail()` and `deleteEmail()` functions that update the local email list state.

**Alternatives considered**:

- Inline handlers in useKeyboard — rejected, violates separation of concerns
- Redux-like state store — rejected, overkill for single-feature state

---

### Decision 4: Confirmation Prompt Implementation

**What was chosen**: Simple y/n prompt using Ink's built-in input handling.

**Rationale**: Matches the Constitution requirement for explicit confirmation. Simple to implement and test.

**Alternatives considered**:

- Confirmation modal component — rejected, overkill for TUI
- Command-line flag (--confirm) — rejected, interactive TUI should use interactive confirmation

---

## Key Findings

- `GmailClient` already has `archive(messageIds: string[])` and `trash(messageIds: string[])` methods
- Both methods return `BatchResult` with succeeded/failed arrays
- `useKeyboard` hook uses Ink's `useInput` for key handling
- Tests use `ink-testing-library` for component testing
