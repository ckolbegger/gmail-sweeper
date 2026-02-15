# TypeScript Type Imports

When importing TypeScript types and interfaces, use `import type`:

```typescript
// ✓ Correct
import type { Email, Config } from '../models/index.js';
import type { GmailClient } from '../core/gmail/client.js';

// ✗ Wrong
import { Email, Config } from '../models/index.js';
```

## Rationale

Using `import type` ensures types are erased at runtime and prevents bundling issues. This follows TypeScript best practices.
