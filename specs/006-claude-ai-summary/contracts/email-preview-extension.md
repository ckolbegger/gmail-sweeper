# Contract: EmailPreview Extension

**File**: `src/tui/components/EmailPreview.tsx` (extended)

## New Props

```typescript
import type { SummaryState } from '../hooks/useEmailSummary.js';
export type DetailViewMode = 'full' | 'summary';

interface EmailPreviewProps {
  email: Email | undefined;
  maxHeight: number;
  scrollOffset?: number;
  paneWidth?: number;
  // NEW:
  viewMode?: DetailViewMode;        // default: 'full'
  summaryState?: SummaryState;      // required when viewMode === 'summary'
}
```

## Rendering Contract

| `viewMode` | `summaryState.status` | Panel renders |
|------------|-----------------------|---------------|
| `'full'` | any | Existing full email rendering (unchanged) |
| `'summary'` | `'idle'` | Same as `'full'` (toggle not yet triggered — should not occur normally) |
| `'summary'` | `'loading'` | Header + separator + `⏳ Generating summary...` |
| `'summary'` | `'ready'` | Header + separator + one-sentence + blank line + bullet list |
| `'summary'` | `'error'` | Header + separator + `⚠ {error}. Press 's' to retry.` |

## Summary Rendering Format

```
{subject}
From: {sender}
To: {recipients}
────────────────────────────
{oneSentence}

• {actionItem1}
• {actionItem2}

[s] full view
```

If `actionItems` is empty:
```
{oneSentence}

(No action items)

[s] full view
```

## useKeyboard Extension

**File**: `src/tui/hooks/useKeyboard.ts`

New option added:
```typescript
interface UseKeyboardOptions {
  // ... existing ...
  onToggleSummary?: () => void;  // NEW
}
```

Key binding added in `useInput` handler:
```typescript
if (input === 's' && itemCount > 0) {
  onToggleSummary?.();
  return;
}
```

## app.tsx Changes

New state:
```typescript
const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('full');
```

Reset on email change:
```typescript
useEffect(() => {
  setDetailViewMode('full');
  emailSummary.reset();
}, [selectedEmail?.id]);
```

Toggle callback:
```typescript
const handleToggleSummary = useCallback(() => {
  if (detailViewMode === 'full') {
    setDetailViewMode('summary');
    if (selectedEmail) emailSummary.requestSummary(selectedEmail);
  } else {
    setDetailViewMode('full');
  }
}, [detailViewMode, selectedEmail, emailSummary]);
```
