# Data Model: Email Action Keys

**Date**: 2026-03-01
**Feature**: 004-glm-email-action-keys

## Overview

This feature does not introduce new data entities. It uses existing types and adds action handlers to the application state.

## Existing Entities Used

### Email

- **Source**: `src/core/models/email.ts`
- **Usage**: The email being archived or deleted
- **Key fields**: `id` (used for API calls), `labels` (checked for INBOX)

### BatchActionResult

- **Source**: `src/core/contracts/gmail-api.ts`
- **Usage**: Return type from archive/delete API calls
- **Structure**:
  ```typescript
  interface BatchActionResult {
    success: boolean;
    successfulCount: number;
    failedCount: number;
    failures: Array<{ emailId: string; error: string }>;
  }
  ```

## State Changes

### App State (App.tsx)

| State             | Change   | Description                                      |
| ----------------- | -------- | ------------------------------------------------ |
| `emails`          | Modified | Email removed from array after successful action |
| `selectedEmailId` | Modified | Updated to next logical email after removal      |
| `statusMessage`   | Modified | Shows action result (success/error)              |

### Selection Auto-Advance Logic

After removing an email from the list:

```
┌─────────────────────────────────────────────────────────────┐
│                    Selection Transition                      │
├─────────────────────────────────────────────────────────────┤
│ Current Index │ List After Action │ New Selection           │
├───────────────┼───────────────────┼────────────────────────┤
│ 0 (first)     │ [1, 2, 3, ...]    │ Index 0 (was index 1)  │
│ 1 (middle)    │ [0, 2, 3, ...]    │ Index 1 (was index 2)  │
│ n (last)      │ [0, 1, ..., n-1]  │ Index n-1 (previous)   │
│ 0 (only)      │ []                │ undefined (empty)      │
└─────────────────────────────────────────────────────────────┘
```

## No Schema Changes

This feature requires no database schema changes. All operations are:

1. API calls to Gmail (archive/delete)
2. Local state updates in React
3. Optional: Local cache invalidation (handled by removing from `emails` state)
