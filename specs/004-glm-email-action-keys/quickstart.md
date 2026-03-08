# Quickstart: Email Action Keys

**Feature**: 004-glm-email-action-keys
**Date**: 2026-03-01

## Overview

Add keyboard shortcuts for archiving ('e') and deleting ('#') emails in the Gmail Sweep TUI.

## Quick Implementation Guide

### 1. Add Action Handlers (App.tsx)

```typescript
// Add these handlers near other callbacks (around line 220)
const handleArchiveEmail = useCallback(
  async (emailId: string) => {
    if (!gmailClientRef.current || !selectedEmail) return;

    setStatusMessage('Archiving...');
    const result = await gmailClientRef.current.archiveEmails([emailId]);

    if (result.successfulCount > 0) {
      const newEmails = emails.filter((e) => e.id !== emailId);
      setEmails(newEmails);

      // Auto-advance selection
      const currentIndex = displayedEmails.findIndex((e) => e.id === emailId);
      const nextEmail = displayedEmails[currentIndex + 1] || displayedEmails[currentIndex - 1];
      setSelectedEmailId(nextEmail?.id);

      setStatusMessage('Archived 1 email');
    } else {
      setStatusMessage(`Archive failed: ${result.failures[0]?.error}`);
    }
  },
  [emails, displayedEmails, selectedEmail]
);

const handleDeleteEmail = useCallback(
  async (emailId: string) => {
    if (!gmailClientRef.current || !selectedEmail) return;

    setStatusMessage('Deleting...');
    const result = await gmailClientRef.current.deleteEmails([emailId]);

    if (result.successfulCount > 0) {
      const newEmails = emails.filter((e) => e.id !== emailId);
      setEmails(newEmails);

      // Auto-advance selection
      const currentIndex = displayedEmails.findIndex((e) => e.id === emailId);
      const nextEmail = displayedEmails[currentIndex + 1] || displayedEmails[currentIndex - 1];
      setSelectedEmailId(nextEmail?.id);

      setStatusMessage('Deleted 1 email');
    } else {
      setStatusMessage(`Delete failed: ${result.failures[0]?.error}`);
    }
  },
  [emails, displayedEmails, selectedEmail]
);
```

### 2. Register Keyboard Shortcuts (App.tsx)

Add to the `useKeyboard` shortcuts array (around line 393):

```typescript
{
  key: 'e',
  handler: () => {
    if (filterMode || showHelp || isRefreshing || !selectedEmail) return false;
    void handleArchiveEmail(selectedEmail.id);
  },
  description: 'Archive email',
},
{
  key: '#',
  handler: () => {
    if (filterMode || showHelp || isRefreshing || !selectedEmail) return false;
    void handleDeleteEmail(selectedEmail.id);
  },
  description: 'Delete email',
},
```

### 3. Update Help Panel (help.ts)

Add new section to `HELP_SECTIONS`:

```typescript
{
  title: 'Actions',
  commands: [
    { key: 'e', description: 'Archive selected email' },
    { key: '#', description: 'Delete selected email (move to trash)' },
  ],
},
```

### 4. Update Footer (App.tsx)

Update the dim footer text (around line 737) to include:

```
e Archive • # Delete
```

## Testing

```bash
# Run tests
npm test

# Run specific test file
npm test -- app-actions.test.ts

# Run with coverage
npm run test:coverage
```

## Key Files

| File                                 | Purpose                                    |
| ------------------------------------ | ------------------------------------------ |
| `src/cli/app.tsx`                    | Main component with handlers and shortcuts |
| `src/cli/help.ts`                    | Help panel documentation                   |
| `src/core/services/gmail-client.ts`  | API methods (already exist)                |
| `tests/unit/cli/app-actions.test.ts` | Unit tests for handlers                    |
