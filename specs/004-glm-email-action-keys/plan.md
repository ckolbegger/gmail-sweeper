# Implementation Plan: Email Action Keys

**Branch**: `004-glm-email-action-keys` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-glm-email-action-keys/spec.md`

## Summary

Add two keyboard shortcuts for email actions in both list and detail views:

- **'e' key**: Archive the selected email (removes INBOX label via Gmail API)
- **'#' key**: Delete the selected email (moves to trash via Gmail API)

Both actions remove the email from the displayed list and auto-advance selection to the next email.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 20+  
**Primary Dependencies**: Ink 4.x (React for CLI), React 18.x, googleapis  
**Storage**: SQLite via better-sqlite3 (existing)  
**Testing**: Vitest 2.1.8, ink-testing-library  
**Target Platform**: Node.js CLI (Linux/macOS/Windows)
**Project Type**: Single project (TUI application)
**Performance Goals**: <500ms perceived response time for archive/delete actions
**Constraints**: No confirmation dialog required (Gmail trash is recoverable)
**Scale/Scope**: Single-user CLI application

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Safety & Security (NON-NEGOTIABLE)

- ✅ **COMPLIANT**: Delete operations move to trash (recoverable), not permanent deletion
- ✅ **COMPLIANT**: No confirmation dialog required per spec (trash is recoverable)
- ✅ **COMPLIANT**: No secrets logged

### II. Strict Test-Driven Development (TDD)

- ✅ **COMPLIANT**: Will write tests first for all new functionality
- Required tests:
  - Unit: Action handlers in App component
  - Unit: Keyboard shortcut registration
  - Integration: Email list update after action
  - Integration: Selection auto-advance

### III. Modular Architecture

- ✅ **COMPLIANT**: Using existing GmailClient methods (archiveEmails, deleteEmails)
- ✅ **COMPLIANT**: Adding handlers in App.tsx following existing pattern
- ✅ **COMPLIANT**: Updating help.ts for documentation

### IV. CLI Excellence

- ✅ **COMPLIANT**: Standard key bindings ('e' for archive, '#' for delete - Gmail conventions)
- ✅ **COMPLIANT**: Status messages for success/error feedback
- ✅ **COMPLIANT**: No exit code changes needed

### V. Simplicity & YAGNI

- ✅ **COMPLIANT**: Only implementing exactly what's in the spec
- ✅ **COMPLIANT**: Reusing existing infrastructure (GmailClient, useKeyboard hook)
- ✅ **COMPLIANT**: No new dependencies required

## Project Structure

### Documentation (this feature)

```text
specs/004-glm-email-action-keys/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── email-actions.ts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── app.tsx              # MODIFY: Add 'e' and '#' shortcuts
│   └── help.ts              # MODIFY: Add new shortcuts to help panel
├── core/
│   ├── services/
│   │   └── gmail-client.ts  # EXISTING: archiveEmails(), deleteEmails()
│   └── contracts/
│       └── gmail-api.ts     # EXISTING: BatchActionResult type
└── ...

tests/
├── unit/
│   └── cli/
│       ├── app-actions.test.ts  # NEW: Unit tests for action handlers
│       └── use-keyboard.test.ts # EXISTING: May need minor updates
└── integration/
    └── email-actions.test.ts    # NEW: Integration tests for full flow
```

**Structure Decision**: Single project structure. All changes are within existing `src/cli/` for handlers and `src/core/services/` for API calls (which already exist). No new modules needed.

## Complexity Tracking

> No violations - all changes use existing patterns and infrastructure.

| Aspect           | Decision                 | Rationale                                      |
| ---------------- | ------------------------ | ---------------------------------------------- |
| No new services  | Use existing GmailClient | archiveEmails/deleteEmails already implemented |
| No state library | Use React useState       | Existing pattern in App.tsx                    |
| No new hooks     | Use existing useKeyboard | Existing pattern for shortcuts                 |

## Implementation Approach

### Phase 0: Research (Complete)

Research completed via exploration agents. Key findings:

1. **Keyboard Pattern**: Add shortcuts to `useKeyboard` in App.tsx with guard conditions
2. **State Pattern**: Update `emails` state, `displayedEmails` auto-updates via useMemo
3. **API Pattern**: GmailClient methods return `BatchActionResult` with success/failure info
4. **Test Pattern**: Vitest + vi.mock for Gmail API

### Phase 1: Design (This Document)

All clarifications resolved. No NEEDS CLARIFICATION items remain.

### Key Implementation Details

#### 1. Action Handler Pattern

```typescript
// In App.tsx, add to useKeyboard shortcuts array:
{
  key: 'e',
  handler: () => {
    if (filterMode || showHelp || !selectedEmail) return false;
    void handleArchiveEmail(selectedEmail.id);
    return;
  },
  description: 'Archive email',
},
{
  key: '#',
  handler: () => {
    if (filterMode || showHelp || !selectedEmail) return false;
    void handleDeleteEmail(selectedEmail.id);
    return;
  },
  description: 'Delete email',
},
```

#### 2. State Update Pattern

```typescript
// Handler functions to add:
const handleArchiveEmail = useCallback(async (emailId: string) => {
  if (!gmailClientRef.current) return;

  setStatusMessage('Archiving...');
  const result = await gmailClientRef.current.archiveEmails([emailId]);

  if (result.success) {
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    setStatusMessage('Archived 1 email');
    // Selection auto-advances via displayedEmails useMemo
  } else {
    setStatusMessage(`Archive failed: ${result.failures[0]?.error}`);
  }
}, []);
```

#### 3. Selection Auto-Advance

After removing email from list, `displayedEmails` updates automatically via useMemo.
The `selectedEmail` computation finds the email by ID or falls back to first email.
If the removed email was selected, need to explicitly update `selectedEmailId`:

```typescript
// After successful removal:
const currentIndex = displayedEmails.findIndex((e) => e.id === emailId);
const nextEmail = displayedEmails[currentIndex] || displayedEmails[currentIndex - 1];
setSelectedEmailId(nextEmail?.id);
```

#### 4. Help Panel Update

Add to `HELP_SECTIONS` in `src/cli/help.ts`:

```typescript
{
  title: 'Actions',
  commands: [
    { key: 'e', description: 'Archive selected email' },
    { key: '#', description: 'Delete selected email' },
  ],
},
```

#### 5. Footer Update

Update the dim footer text in App.tsx line ~737 to include new shortcuts.
