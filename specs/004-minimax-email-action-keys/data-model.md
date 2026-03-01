# Data Model: Email Action Keys

## Entities

### ActionResult

The outcome of an archive or delete operation.

```typescript
interface ActionResult {
  type: 'success' | 'failure' | 'confirmation-required';
  emailId: string;
  action: 'archive' | 'delete';
  error?: string; // Present only for failure
}
```

### EmailActionState

State managed by useEmailActions hook.

```typescript
interface EmailActionState {
  isProcessing: boolean;
  lastAction: ActionResult | null;
  showDeleteConfirmation: boolean;
  confirmationTargetEmailId: string | null;
}
```

## Relationships

- `EmailActionState` is local UI state only (not persisted)
- `ActionResult` is emitted to parent component for handling
- Parent component (App) manages the `emails` array and handles removal on success

## State Transitions

```
idle --('e' key)--> archive-email --> (success) --> idle
                                        (failure) --> show-error --> idle

idle --('#' key)--> show-confirmation
                         |
           +-------------+-------------+
           |             |             |
        (y pressed)  (n pressed)  (Escape)
           |             |             |
           v             v             v
      delete-email   idle          idle
           |
      (success)
           |
           v
        idle
```

## Validation Rules

- `emailId` must be non-empty string
- `action` must be 'archive' or 'delete'
- `error` message (when present) should be user-friendly, not raw API error

## Key Entities from Spec

- **Selected Email**: The email currently focused in list or detail view
- **Action Result**: The outcome of the archive/delete operation
