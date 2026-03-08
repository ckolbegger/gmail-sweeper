# Research: Email Action Keys

**Date**: 2026-03-01
**Feature**: 004-glm-email-action-keys
**Status**: Complete

## Overview

This document consolidates research findings for implementing keyboard shortcuts for email archive and delete actions in the Gmail Sweep TUI application.

## Research Questions

### 1. How are keyboard shortcuts registered and handled?

**Decision**: Use existing `useKeyboard` hook pattern

**Rationale**: The codebase already has a well-established pattern for keyboard shortcuts using the `useKeyboard` hook in `src/cli/hooks/use-keyboard.ts`. This hook accepts an array of `KeyboardShortcut` objects and handles key matching, including Ctrl/Shift modifiers.

**Pattern**:

```typescript
useKeyboard({
  shortcuts: [
    { key: 'e', handler: handleArchive, description: 'Archive email' },
    { key: '#', handler: handleDelete, description: 'Delete email' },
  ],
});
```

**Alternatives Considered**:

- Direct `useInput` in component: Rejected - would conflict with global handling
- New hook: Rejected - unnecessary duplication

### 2. How should shortcuts interact with modal states (filter input, help panel)?

**Decision**: Guard handlers with `filterMode` and `showHelp` state checks

**Rationale**: Existing shortcuts in App.tsx use guard conditions like `if (filterMode || showHelp) return false;` to prevent shortcuts from firing during modal states.

**Pattern**:

```typescript
{
  key: 'e',
  handler: () => {
    if (filterMode || showHelp) return false;
    // ... handle archive
  },
  description: 'Archive email',
}
```

### 3. How does the app manage email list state?

**Decision**: Use existing `useState` pattern with `useMemo` for computed values

**Rationale**: App.tsx uses:

- `useState<Email[]>` for `emails` - the master list
- `useMemo` for `displayedEmails` - filtered/sorted subset
- `useState<string | undefined>` for `selectedEmailId`

**Update Pattern**:

```typescript
// To remove email after action:
setEmails((prev) => prev.filter((e) => e.id !== removedId));
```

**Selection Auto-Advance**:
After removing an email, selection should move to:

- Next email in list (same index)
- Previous email if removed was last
- No selection if list is empty

### 4. What are the GmailClient method signatures for archive and delete?

**Decision**: Use existing `archiveEmails()` and `deleteEmails()` methods

**Rationale**: GmailClient already implements these methods:

- `archiveEmails(emailIds: string[]): Promise<BatchActionResult>`
- `deleteEmails(emailIds: string[]): Promise<BatchActionResult>`

**BatchActionResult Structure**:

```typescript
interface BatchActionResult {
  success: boolean;
  successfulCount: number;
  failedCount: number;
  failures: Array<{ emailId: string; error: string }>;
}
```

**Implementation Note**: Both methods accept an array of email IDs, enabling batch operations in the future.

### 5. What testing patterns should be used?

**Decision**: Vitest with vi.mock for Gmail API

**Rationale**: Existing test suite uses:

- Vitest as test framework
- `vi.mock('googleapis')` for Gmail API mocking
- `ink-testing-library` for component tests

**Test Structure**:

```
tests/
├── unit/cli/
│   └── app-actions.test.ts      # Handler logic tests
└── integration/
    └── email-actions.test.ts    # Full flow tests
```

## Key Files to Modify

| File                                      | Change                              | Impact   |
| ----------------------------------------- | ----------------------------------- | -------- |
| `src/cli/app.tsx`                         | Add action handlers and shortcuts   | Medium   |
| `src/cli/help.ts`                         | Add documentation for new shortcuts | Low      |
| `tests/unit/cli/app-actions.test.ts`      | New: unit tests for handlers        | New file |
| `tests/integration/email-actions.test.ts` | New: integration tests              | New file |

## Dependencies

No new dependencies required. All functionality uses existing infrastructure:

- Ink (React for CLI)
- googleapis (Gmail API)
- Vitest (testing)
