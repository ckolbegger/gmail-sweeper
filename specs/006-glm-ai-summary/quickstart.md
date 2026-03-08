# Quickstart: AI Email Summary

**Feature**: 006-glm-ai-summary  
**Estimated Time**: 4-6 hours (including tests)

## Prerequisites

- ✅ Node.js 20+ installed
- ✅ Repository cloned and dependencies installed (`npm install`)
- ✅ AI provider configured (AI_PROVIDER and AI_API_KEY environment variables set)
- ✅ Database migrations up to date
- ✅ Tests passing (`npm test`)

## Implementation Steps

### Step 1: Database Migration (15 minutes)

**Create migration file**:

```bash
# Create migration
touch src/core/persistence/migrations/003_add_summary_column.sql
```

**Add migration content**:

```sql
-- Add summary column to emails table
ALTER TABLE emails ADD COLUMN summary TEXT;
```

**Test migration**:

```bash
# Run app to apply migration
npm run dev

# Verify column exists
sqlite3 ~/.gmail-sweep/gmail-sweep.db "PRAGMA table_info(emails);" | grep summary
```

**Expected Output**: `3|summary|TEXT|0||0`

---

### Step 2: Update Email Model (20 minutes)

**Update validation schema** (`src/core/models/validation.ts`):

```typescript
export const EmailSchema = z.object({
  // ... existing fields (keep all)
  id: z.string(),
  threadId: z.string(),
  // ... (all existing fields)

  // ADD THIS:
  summary: z.string().optional(),
});
```

**Update repository** (`src/core/services/email-repository.ts`):

```typescript
// In save() method - add summary to INSERT statement
async save(email: Email): Promise<void> {
  const stmt = this.db.prepare(`
    INSERT OR REPLACE INTO emails (
      id, thread_id, subject, sender_name, sender_email,
      recipients, cc, bcc, date_received, body_text, body_html,
      labels, is_read, category, snippet, history_id, synced_at,
      summary  -- ADD THIS
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    --         ADD ONE MORE ? ABOVE
  `);

  // ... existing parameter binding ...

  stmt.run(
    // ... existing parameters ...
    email.summary || null  // ADD THIS at the end
  );
}

// In mapRowToEmail() method - add summary field
private mapRowToEmail(row: any): Email {
  return {
    // ... existing fields ...
    summary: row.summary,  // ADD THIS
  };
}
```

**Write test** (`tests/unit/core/email-repository-summary.test.ts`):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EmailRepository } from '../../../src/core/services/email-repository.js';
import { getDatabase, closeDatabase } from '../../../src/core/persistence/database.js';
import type { Email } from '../../../src/core/models/email.js';

describe('EmailRepository - Summary', () => {
  let repo: EmailRepository;

  beforeEach(() => {
    const db = getDatabase({ path: ':memory:' });
    repo = new EmailRepository(db);
  });

  it('should save email with summary', async () => {
    const email: Email = {
      id: 'test-1',
      // ... required fields ...
      summary: JSON.stringify({
        summary: 'Test summary',
        actionItems: ['Action 1'],
      }),
    };

    await repo.save(email);
    const retrieved = await repo.getById('test-1');

    expect(retrieved?.summary).toBeDefined();
    expect(JSON.parse(retrieved!.summary!)).toEqual({
      summary: 'Test summary',
      actionItems: ['Action 1'],
    });
  });

  it('should handle email without summary', async () => {
    const email: Email = {
      id: 'test-2',
      // ... required fields ...
      // summary: undefined
    };

    await repo.save(email);
    const retrieved = await repo.getById('test-2');

    expect(retrieved?.summary).toBeUndefined();
  });
});
```

**Run test**:

```bash
npm test -- email-repository-summary
```

---

### Step 3: Create Summary Service (60 minutes)

**Create prompt builder** (`src/core/ai/summary-prompt.ts`):

```typescript
import type { Email } from '../models/email.js';

export interface SummaryPrompt {
  system: string;
  user: string;
}

export function buildSummaryPrompt(email: Email): SummaryPrompt {
  const systemPrompt = `You are an email summarizer. Create concise summaries of email content.

Return a JSON object with exactly these fields:
- summary: a single sentence describing the email's content
- actionItems: an array of action items extracted from the email (strings)

Guidelines:
- The summary should capture the main topic and purpose in one clear sentence
- Extract explicit requests, deadlines, or tasks as action items
- If no action items are present, return an empty array
- Be concise and factual
- Respond only with the JSON object, no additional text`;

  const userPrompt = `Email:
Subject: ${email.subject}
From: ${email.sender.name || email.sender.email}
Date: ${email.dateReceived.toLocaleDateString()}

${email.body.text || email.snippet || 'No content'}`;

  return { system: systemPrompt, user: userPrompt };
}
```

**Write prompt builder test** (`tests/unit/ai/summary-prompt.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { buildSummaryPrompt } from '../../../src/core/ai/summary-prompt.js';
import type { Email } from '../../../src/core/models/email.js';

describe('buildSummaryPrompt', () => {
  it('should generate system and user prompts', () => {
    const email: Email = {
      id: '1',
      subject: 'Meeting Tomorrow',
      sender: { name: 'John', email: 'john@example.com' },
      dateReceived: new Date('2024-01-15'),
      body: { text: "Let's meet at 2pm" },
      // ... other required fields
    } as Email;

    const prompt = buildSummaryPrompt(email);

    expect(prompt.system).toContain('email summarizer');
    expect(prompt.system).toContain('JSON object');
    expect(prompt.user).toContain('Meeting Tomorrow');
    expect(prompt.user).toContain('John');
  });
});
```

**Create summary service** (`src/core/services/summary-service.ts`):

````typescript
import type { AiProvider } from '../ai/provider.js';
import type { Email } from '../models/email.js';
import { buildSummaryPrompt } from '../ai/summary-prompt.js';
import { SummaryGenerationError } from '../errors/index.js';

export interface EmailSummary {
  summary: string;
  actionItems: string[];
}

export class SummaryService {
  constructor(private readonly aiProvider: AiProvider) {}

  async generateSummary(email: Email): Promise<EmailSummary> {
    const prompt = buildSummaryPrompt(email);

    try {
      // Note: This requires extending AiProvider or using a different approach
      // For now, assume we add a generic callLLM method
      const response = await this.aiProvider.callLLM(prompt);
      return this.parseResponse(response);
    } catch (error) {
      throw new SummaryGenerationError('Failed to generate summary', error as Error);
    }
  }

  hasSummary(email: Email): boolean {
    return email.summary !== undefined && email.summary !== null;
  }

  parseSummary(summaryJson: string): EmailSummary {
    try {
      const parsed = JSON.parse(summaryJson);
      this.validateSummary(parsed);
      return parsed;
    } catch (error) {
      throw new SummaryGenerationError('Invalid summary format', error as Error);
    }
  }

  private parseResponse(text: string): EmailSummary {
    // Strip markdown code blocks
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      throw new SummaryGenerationError('Failed to parse LLM response as JSON');
    }

    // Validate
    this.validateSummary(parsed);
    return parsed as EmailSummary;
  }

  private validateSummary(obj: unknown): void {
    if (typeof obj !== 'object' || obj === null) {
      throw new SummaryGenerationError('Summary must be an object');
    }

    const summary = obj as Record<string, unknown>;

    if (typeof summary.summary !== 'string') {
      throw new SummaryGenerationError('Summary must have a string "summary" field');
    }

    if (!Array.isArray(summary.actionItems)) {
      throw new SummaryGenerationError('Summary must have an array "actionItems" field');
    }

    for (const item of summary.actionItems) {
      if (typeof item !== 'string') {
        throw new SummaryGenerationError('Action items must be strings');
      }
    }
  }
}
````

**Write service test** (`tests/unit/core/summary-service.test.ts`):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SummaryService } from '../../../src/core/services/summary-service.js';
import type { AiProvider } from '../../../src/core/ai/provider.js';
import type { Email } from '../../../src/core/models/email.js';

describe('SummaryService', () => {
  const mockProvider: AiProvider = {
    classifyEmails: vi.fn(),
    callLLM: vi.fn(),
  };

  const service = new SummaryService(mockProvider);

  const testEmail: Email = {
    id: '1',
    subject: 'Test',
    sender: { name: 'Test', email: 'test@test.com' },
    dateReceived: new Date(),
    body: { text: 'Test content' },
    // ... other required fields
  } as Email;

  it('should generate summary from LLM', async () => {
    const llmResponse = JSON.stringify({
      summary: 'Test summary',
      actionItems: ['Action 1', 'Action 2'],
    });

    vi.mocked(mockProvider.callLLM).mockResolvedValueOnce(llmResponse);

    const result = await service.generateSummary(testEmail);

    expect(result.summary).toBe('Test summary');
    expect(result.actionItems).toEqual(['Action 1', 'Action 2']);
  });

  it('should parse existing summary', () => {
    const summaryJson = JSON.stringify({
      summary: 'Existing summary',
      actionItems: ['Task 1'],
    });

    const result = service.parseSummary(summaryJson);

    expect(result.summary).toBe('Existing summary');
    expect(result.actionItems).toEqual(['Task 1']);
  });

  it('should detect if email has summary', () => {
    const emailWithSummary = { ...testEmail, summary: '{}' };
    const emailWithoutSummary = { ...testEmail };

    expect(service.hasSummary(emailWithSummary)).toBe(true);
    expect(service.hasSummary(emailWithoutSummary)).toBe(false);
  });
});
```

**Run tests**:

```bash
npm test -- summary-service
```

---

### Step 4: Update Email Detail Component (90 minutes)

**Remove global 's' shortcut** (`src/cli/app.tsx`):

```typescript
// Find the useKeyboard call and REMOVE this shortcut:
// { key: 's', handler: handleSort, description: 'Sort by sender' },
```

**Update EmailDetail component** (`src/cli/components/email-detail.tsx`):

```typescript
// Add state at top of component
const [isShowingSummary, setIsShowingSummary] = useState(false);
const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'error'>('idle');
const [summaryError, setSummaryError] = useState<string>('');
const [emailSummary, setEmailSummary] = useState<EmailSummary | null>(null);

// Add 's' key handler
const handleToggleSummary = async () => {
  if (!email) return;

  // If showing summary, toggle back to full email
  if (isShowingSummary) {
    setIsShowingSummary(false);
    return;
  }

  // Check if summary already exists
  if (email.summary) {
    const summary = summaryService.parseSummary(email.summary);
    setEmailSummary(summary);
    setIsShowingSummary(true);
    return;
  }

  // Generate new summary
  setSummaryStatus('loading');
  setSummaryError('');

  try {
    const summary = await summaryService.generateSummary(email);
    setEmailSummary(summary);

    // Save to database
    email.summary = JSON.stringify(summary);
    await emailRepository.save(email);

    setIsShowingSummary(true);
    setSummaryStatus('idle');
  } catch (error) {
    setSummaryStatus('error');
    setSummaryError(error instanceof Error ? error.message : 'Unknown error');
  }
};

// Add to useKeyboard shortcuts array
useKeyboard({
  shortcuts: [
    // ... existing shortcuts (u, U, c, o) ...
    { key: 's', handler: handleToggleSummary, description: 'Toggle summary' },
  ],
});

// Render summary view
if (isShowingSummary && emailSummary) {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>{email.subject}</Text>
      <Text dimColor>{'─'.repeat(maxBodyColumns - 2)}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan" bold>Summary:</Text>
        <Text>{emailSummary.summary}</Text>
        {emailSummary.actionItems.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow" bold>Action Items:</Text>
            {emailSummary.actionItems.map((item, i) => (
              <Text key={i}>• {item}</Text>
            ))}
          </Box>
        )}
      </Box>
      <Text dimColor>
        Press 's' to return to full email
      </Text>
    </Box>
  );
}

// Show loading state in status line
{summaryStatus === 'loading' && (
  <Text dimColor>Generating summary...</Text>
)}
{summaryStatus === 'error' && (
  <Text color="red">Error: {summaryError}</Text>
)}
```

**Write UI test** (`tests/unit/cli/email-detail-summary.test.tsx`):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { EmailDetail } from '../../../src/cli/components/email-detail.js';

describe('EmailDetail - Summary', () => {
  it('should toggle to summary view on s key', async () => {
    const email = {
      id: '1',
      subject: 'Test Email',
      summary: JSON.stringify({
        summary: 'Test summary',
        actionItems: ['Task 1']
      }),
      // ... other required fields
    };

    const { lastFrame, stdin } = render(<EmailDetail email={email} />);

    // Press 's'
    stdin.write('s');

    await waitFor(() => {
      expect(lastFrame()).toContain('Test summary');
      expect(lastFrame()).toContain('Task 1');
    });
  });

  it('should show loading state while generating', async () => {
    // Test loading state
  });

  it('should show error on generation failure', async () => {
    // Test error state
  });
});
```

---

### Step 5: Integration Test (30 minutes)

**Create integration test** (`tests/integration/email-summary-flow.test.ts`):

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDatabase, closeDatabase } from '../../src/core/persistence/database.js';
import { EmailRepository } from '../../src/core/services/email-repository.js';
import { SummaryService } from '../../src/core/services/summary-service.js';
import { createAiProvider } from '../../src/core/ai/provider.js';
import { resolveAiConfig } from '../../src/core/ai/config.js';

describe('Email Summary Flow (Integration)', () => {
  let db: any;
  let emailRepo: EmailRepository;
  let summaryService: SummaryService;

  beforeAll(() => {
    db = getDatabase({ path: ':memory:' });
    emailRepo = new EmailRepository(db);

    const config = resolveAiConfig();
    if (!config) throw new Error('AI config required');

    const aiProvider = createAiProvider(config);
    summaryService = new SummaryService(aiProvider);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should generate and store summary end-to-end', async () => {
    // Create test email
    const email = {
      id: 'integration-test-1',
      subject: 'Project Update Required',
      sender: { name: 'Boss', email: 'boss@company.com' },
      dateReceived: new Date(),
      body: {
        text: 'Please review the Q4 report by Friday and send feedback.',
      },
      // ... other required fields
    } as Email;

    // Save email
    await emailRepo.save(email);

    // Generate summary
    const summary = await summaryService.generateSummary(email);
    expect(summary.summary).toBeDefined();
    expect(summary.actionItems).toBeInstanceOf(Array);

    // Save summary
    email.summary = JSON.stringify(summary);
    await emailRepo.save(email);

    // Retrieve and verify
    const retrieved = await emailRepo.getById(email.id);
    expect(retrieved?.summary).toBeDefined();

    const parsed = summaryService.parseSummary(retrieved!.summary!);
    expect(parsed.summary).toBe(summary.summary);
    expect(parsed.actionItems).toEqual(summary.actionItems);
  });
});
```

**Run integration test**:

```bash
npm test -- email-summary-flow
```

---

### Step 6: Manual Testing (20 minutes)

**Test in running application**:

```bash
# Start app
npm run dev

# Test scenarios:
# 1. Select email, press 's' → should generate summary
# 2. Press 's' again → should toggle back to full email
# 3. Press 's' again → should show summary immediately (no LLM call)
# 4. Switch to different email → summary should clear
# 5. Test with email that has no actionable items
# 6. Test with long email (>5000 chars)
# 7. Test error handling (disable network, press 's')
```

---

## Verification Checklist

- [ ] Migration applied successfully
- [ ] Email model updated with summary field
- [ ] Repository saves/retrieves summaries
- [ ] Summary service generates valid summaries
- [ ] Prompt builder creates proper prompts
- [ ] UI toggles between views correctly
- [ ] Loading state displays during generation
- [ ] Error state displays on failure
- [ ] Summary persists across app restarts
- [ ] LLM called only once per email
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete

---

## Troubleshooting

### Migration Not Applied

```bash
# Check migration status
sqlite3 ~/.gmail-sweep/gmail-sweep.db "SELECT * FROM _migrations;"

# Manually apply migration
sqlite3 ~/.gmail-sweep/gmail-sweep.db < src/core/persistence/migrations/003_add_summary_column.sql
```

### LLM Errors

```bash
# Verify AI config
echo $AI_PROVIDER
echo $AI_API_KEY

# Test with curl
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":1024,"messages":[{"role":"user","content":"test"}]}'
```

### Summary Not Persisting

```bash
# Check database
sqlite3 ~/.gmail-sweep/gmail-sweep.db "SELECT id, summary FROM emails LIMIT 5;"

# Verify summary is JSON
sqlite3 ~/.gmail-sweep/gmail-sweep.db "SELECT json_valid(summary) FROM emails WHERE summary IS NOT NULL;"
```

---

## Next Steps

After completing this quickstart:

1. Review code for edge cases
2. Add additional error handling
3. Consider performance optimizations
4. Update user documentation
5. Create demo video for users

**Total Implementation Time**: ~4-6 hours
