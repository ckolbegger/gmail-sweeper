# Import Style

Use consistent import paths throughout the codebase.

## Rule

Pick ONE style and use it consistently:

**Option A: Relative imports** (currently preferred)
```typescript
import { GmailClient } from '../../core/gmail/client.js';
import { Email } from '../../core/models/index.js';
```

**Option B: Path aliases** (configured but not used)
```typescript
import { GmailClient } from '@core/gmail/client.js';
import { Email } from '@core/models/index.js';
```

Currently, the codebase uses relative imports. Continue using relative imports for consistency.

## Rationale

Mixed import styles create confusion. The project currently uses relative imports - maintain this convention for consistency.
