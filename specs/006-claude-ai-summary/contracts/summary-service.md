# Contract: SummaryService

**File**: `src/core/summary/service.ts`
**Exported from**: `src/core/summary/index.ts`

## Interface

```typescript
import type { Email } from '../models/index.js';
import type { EmailSummary } from '../models/index.js';
import type { AiProviderConfig } from '../ai/provider.js';

export interface SummaryServiceInterface {
  /**
   * Generate an AI summary for a single email.
   * Returns a structured EmailSummary.
   * Throws SummaryGenerationError on AI failure or parse error.
   */
  summarize(email: Email): Promise<EmailSummary>;
}

export class SummaryService implements SummaryServiceInterface {
  constructor(config: AiProviderConfig) {}
  summarize(email: Email): Promise<EmailSummary> {}
}

export class SummaryGenerationError extends Error {
  constructor(message: string, public readonly cause?: Error) {}
}
```

## Prompt Contract

**System prompt**: Sets assistant as an email summarizer that responds in plain text.

**User prompt structure**:
```
Summarize this email. Respond with exactly:
1. One sentence describing what the email is about.
2. A blank line.
3. A bullet list (using "- ") of action items required from the recipient. If there are no action items, write "- None".

Email subject: {subject}
From: {senderName} <{senderEmail}>

{bodyText}
```

**Expected response structure**:
```
{one sentence description}.

- {action item 1}
- {action item 2}
```

## Parsing Contract

`parseSummaryResponse(raw: string): { oneSentence: string; actionItems: string[] }`

1. Trim the raw response.
2. Split on first `\n\n` (blank line).
3. `oneSentence` = first segment, trimmed.
4. Parse remaining lines: collect lines starting with `- `, strip the `- ` prefix.
5. Filter out `"None"` (case-insensitive).
6. `actionItems` = resulting array (may be empty).
7. If `oneSentence` is empty after parsing, throw `SummaryGenerationError`.
