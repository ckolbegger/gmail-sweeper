# Quickstart: Email Action Keys

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run in development
npm run dev
```

## Implementation Order

1. **Add types to `src/core/models/index.ts`**
   - Add `ActionResult` type

2. **Create `src/tui/hooks/useEmailActions.ts`**
   - Implement archive/delete logic
   - Handle confirmation state
   - Return action functions and state

3. **Modify `src/tui/hooks/useKeyboard.ts`**
   - Add 'e' key handler → calls archive
   - Add '#' key handler → triggers delete confirmation

4. **Create `src/tui/components/ConfirmationPrompt.tsx`**
   - Simple y/n prompt component

5. **Modify `src/tui/app.tsx`**
   - Integrate useEmailActions
   - Wire keyboard handlers
   - Handle email removal from list

## Testing

```bash
# Run unit tests
npm test -- useEmailActions

# Run integration tests
npm test -- email-actions

# Run with coverage
npm run test:coverage
```

## Key Files

| File                                        | Change                     |
| ------------------------------------------- | -------------------------- |
| `src/core/models/index.ts`                  | Add ActionResult type      |
| `src/tui/hooks/useEmailActions.ts`          | NEW - action logic         |
| `src/tui/hooks/useKeyboard.ts`              | MODIFY - add 'e' and '#'   |
| `src/tui/components/ConfirmationPrompt.tsx` | NEW - confirmation UI      |
| `src/tui/app.tsx`                           | MODIFY - integrate actions |

## Debugging

- Use `console.log` in development (remove in production)
- Test keyboard handlers in isolation
- Mock Gmail client in unit tests
