# Summary Service Contract

**Purpose**: Define the interface for AI-powered email summary generation

## Service Interface

```typescript
/**
 * Summary Service
 * 
 * Generates AI-powered summaries of email content using the configured LLM provider.
 * Follows the format: one sentence description + bullet list of action items.
 */
export interface ISummaryService {
  /**
   * Generate a summary for an email.
   * 
   * @param email - The email to summarize
   * @returns Promise resolving to the generated summary
   * @throws SummaryGenerationError if LLM call fails or response is malformed
   */
  generateSummary(email: Email): Promise<EmailSummary>;
  
  /**
   * Check if a summary already exists for an email.
   * 
   * @param email - The email to check
   * @returns true if summary exists (string), false if undefined/null
   */
  hasSummary(email: Email): boolean;
  
  /**
   * Parse summary JSON string into structured object.
   * 
   * @param summaryJson - JSON string from database
   * @returns Parsed EmailSummary object
   * @throws SummaryParseError if JSON is malformed
   */
  parseSummary(summaryJson: string): EmailSummary;
}
```

## Data Types

```typescript
/**
 * Structured email summary
 */
export interface EmailSummary {
  /** One-sentence description of email content */
  summary: string;
  
  /** Array of action items extracted from email */
  actionItems: string[];
}

/**
 * Summary generation error
 */
export class SummaryGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SummaryGenerationError';
  }
}

/**
 * Summary parse error
 */
export class SummaryParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SummaryParseError';
  }
}
```

## Implementation Contract

### Constructor

```typescript
constructor(aiProvider: AiProvider)
```

**Parameters**:
- `aiProvider`: Configured AI provider (Anthropic or OpenAI)

**Behavior**:
- Stores provider reference for LLM calls
- No initialization side effects

### generateSummary()

**Input Validation**:
- `email` must not be null/undefined
- `email.body.text` must not be empty (or fallback to snippet)

**LLM Call**:
- Build prompt using `buildSummaryPrompt(email)`
- Call `aiProvider.callLLM(prompt)` (NOTE: provider doesn't have this method, need to clarify)
- Response must be valid JSON matching EmailSummary schema

**Error Handling**:
- Network errors → SummaryGenerationError with cause
- Timeout errors → SummaryGenerationError with cause
- Malformed response → SummaryGenerationError with cause
- Schema validation errors → SummaryGenerationError with cause

**Success**:
- Returns EmailSummary object
- summary: non-empty string, 1-500 chars
- actionItems: array (may be empty), 0-20 items

### hasSummary()

**Behavior**:
- Returns `true` if `email.summary` is a non-null, non-empty string
- Returns `false` if `email.summary` is undefined, null, or empty string

### parseSummary()

**Input Validation**:
- `summaryJson` must not be null/undefined
- Must be valid JSON string

**Parsing**:
- Parse JSON string
- Validate against EmailSummary schema
- Return typed object

**Error Handling**:
- JSON parse error → SummaryParseError with cause
- Schema validation error → SummaryParseError with cause

## Dependencies

- `AiProvider` (from `src/core/ai/provider.ts`)
- `Email` type (from `src/core/models/email.ts`)
- `buildSummaryPrompt` function (from `src/core/ai/prompt.ts`)

## Test Contract

### Unit Tests Must Verify:

1. **Happy Path**:
   - Generates summary with valid email
   - Returns structured EmailSummary
   - Parses summary JSON correctly

2. **Error Cases**:
   - Throws on null/undefined email
   - Throws on LLM API error
   - Throws on malformed JSON response
   - Throws on schema validation failure

3. **Edge Cases**:
   - Email with empty body (uses snippet)
   - Email with no action items (empty array)
   - Very long email (truncation or handling)

### Integration Tests Must Verify:

1. **End-to-End**:
   - Generates summary with real LLM provider
   - Stores summary in database
   - Retrieves summary from database
   - Displays summary in UI

2. **Performance**:
   - Generation completes within 5 seconds
   - No memory leaks on repeated generation

## Usage Example

```typescript
import { createAiProvider } from '../ai/provider.js';
import { SummaryService } from './summary-service.js';

// Setup
const config = resolveAiConfig();
const aiProvider = createAiProvider(config);
const summaryService = new SummaryService(aiProvider);
const emailRepository = new EmailRepository(db);

// Generate summary
const email = await emailRepository.getById('email-123');
if (email && !summaryService.hasSummary(email)) {
  try {
    const summary = await summaryService.generateSummary(email);
    email.summary = JSON.stringify(summary);
    await emailRepository.save(email);
    console.log('Summary generated:', summary);
  } catch (error) {
    console.error('Failed to generate summary:', error);
  }
}

// Parse existing summary
if (email?.summary) {
  const parsed = summaryService.parseSummary(email.summary);
  console.log('Summary:', parsed.summary);
  console.log('Actions:', parsed.actionItems);
}
```

## Versioning

**Version**: 1.0.0

**Breaking Changes**:
- Changes to EmailSummary schema
- Changes to constructor signature
- Changes to method signatures

**Non-Breaking Changes**:
- New optional methods
- New optional parameters
- Internal implementation changes
