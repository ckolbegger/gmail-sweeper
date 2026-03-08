# Research: AI Email Summary

**Date**: 2026-03-07
**Feature**: 006-glm-ai-summary
**Status**: Complete

## Overview

This document captures research findings and technical decisions for implementing AI-powered email summaries with toggle functionality.

## Research Questions

### 1. How should we handle the 's' key conflict with existing "Sort by sender" action?

**Decision**: Remove global 's' sort shortcut, use 's' exclusively for summary toggle in detail view

**Rationale**:

- The 's' key for "Sort by sender" is a low-value feature (users can sort via other means)
- Summary toggle is a high-value, frequently-used action for the primary use case (reading emails)
- Keyboard shortcuts should prioritize the most common workflows
- Users viewing email details will expect 's' to toggle summary, not sort a list they're not viewing
- Following Gmail convention: 's' is commonly associated with "star" or "summary" actions

**Alternatives Considered**:

1. **Use different key for summary (e.g., 'm' for summary)** - Rejected: 's' is intuitive for "summary", other keys less memorable
2. **Context-aware 's' key (sort in list, summary in detail)** - Rejected: Confusing for users, unclear which mode is active
3. **Use 'S' (shift+s) for summary** - Rejected: Requires shift key, less ergonomic for frequent action
4. **Keep 's' as sort, use ctrl+s for summary** - Rejected: Ctrl combinations less discoverable, breaks single-key UX pattern

**Implementation**:

- Remove 's' shortcut from global keyboard handler in `app.tsx`
- Add 's' handler to `EmailDetail` component's `useKeyboard` call
- Update help panel to show 's' as "Toggle summary" in detail view context

---

### 2. What prompt structure should we use for summary generation?

**Decision**: Follow existing pattern with system + user prompt, JSON response format

**Rationale**:

- Consistent with existing smart filter feature (`buildClassificationPrompt`)
- Proven pattern that works with both Anthropic and OpenAI providers
- JSON response ensures structured, parseable output
- Clear separation of instructions (system) and data (user) improves LLM performance

**Alternatives Considered**:

1. **Free-form text response** - Rejected: Harder to parse, inconsistent format
2. **Markdown response** - Rejected: Additional parsing complexity, less structured
3. **XML response** - Rejected: Less common for LLMs, more verbose

**Implementation**:

```typescript
// System prompt
You are an email summarizer. Create concise summaries of email content.
Return a JSON object with exactly these fields:
- summary: a single sentence describing the email's content
- actionItems: an array of action items extracted from the email (strings)

Guidelines:
- The summary should capture the main topic and purpose in one clear sentence
- Extract explicit requests, deadlines, or tasks as action items
- If no action items are present, return an empty array
- Be concise and factual
- Respond only with the JSON object, no additional text

// User prompt
Email:
Subject: {subject}
From: {sender}
Date: {date}

{body}
```

**Response Schema**:

```typescript
interface SummaryResponse {
  summary: string;
  actionItems: string[];
}
```

---

### 3. How should we handle loading and error states during summary generation?

**Decision**: Display loading indicator in status line, show errors in status line, allow retry

**Rationale**:

- Consistent with existing UI patterns (URL cycling shows status in same line)
- Status line is the standard location for transient feedback
- Loading indicator provides immediate feedback that action was received
- Error messages inform users without blocking the interface
- Retry capability allows recovery from transient failures

**Alternatives Considered**:

1. **Modal loading spinner** - Rejected: Disruptive, blocks view of email content
2. **Inline loading text replacing email body** - Rejected: Loses context, jarring transition
3. **No loading indicator** - Rejected: Users may think 's' key didn't register
4. **Toast notifications** - Rejected: Not available in Ink, inconsistent with existing patterns

**Implementation**:

- State: `isGeneratingSummary` boolean in `EmailDetail` component
- Loading: Show "Generating summary..." in status line (line 347 area)
- Error: Show "Failed to generate summary: {error message}" in status line
- Success: Toggle to summary view, clear status message
- Retry: Pressing 's' again retries generation on error

---

### 4. How should we structure the summary storage in the database?

**Decision**: Add single TEXT column `summary` to `emails` table, store JSON string

**Rationale**:

- Simple, follows existing pattern (recipients, labels stored as JSON)
- Easy to query and update
- Small data size (typically <500 characters)
- No need for separate table or complex relationships
- Consistent with existing repository patterns

**Alternatives Considered**:

1. **Separate `email_summaries` table** - Rejected: Over-engineering, unnecessary join complexity
2. **Two columns: `summary_text` and `action_items`** - Rejected: Premature optimization, complicates repository
3. **Store as plain text (not JSON)** - Rejected: Harder to parse action items, loses structure
4. **Add to `app_metadata` table** - Rejected: Wrong table purpose, harder to query by email

**Implementation**:

Migration (`003_add_summary_column.sql`):

```sql
ALTER TABLE emails ADD COLUMN summary TEXT;
```

Schema update:

```typescript
// validation.ts
const EmailSchema = z.object({
  // ... existing fields
  summary: z.string().optional(),
});
```

Repository updates:

```typescript
// email-repository.ts

// In save():
INSERT OR REPLACE INTO emails (
  // ... existing columns
  summary
) VALUES (?, ?, ?, ...)

// In mapRowToEmail():
return {
  // ... existing fields
  summary: row.summary,
};
```

---

### 5. Should we extend the AiProvider interface or create a separate service?

**Decision**: Create separate SummaryService, don't extend AiProvider interface

**Rationale**:

- Single Responsibility Principle: AiProvider is for classification, not summaries
- SummaryService can orchestrate prompt building, LLM call, and response parsing
- Easier to test and maintain independently
- Doesn't require changes to existing provider implementations
- Follows existing service pattern (GmailClient, EmailRepository)

**Alternatives Considered**:

1. **Add `summarizeEmail` method to AiProvider interface** - Rejected: Mixes concerns, requires updating all providers
2. **Direct LLM calls in EmailDetail component** - Rejected: Violates separation of concerns, hard to test
3. **Create generic `generateContent` method in AiProvider** - Rejected: Too generic, loses domain specificity

**Implementation**:

```typescript
// src/core/services/summary-service.ts

export interface EmailSummary {
  summary: string;
  actionItems: string[];
}

export class SummaryService {
  constructor(private readonly aiProvider: AiProvider) {}

  async generateSummary(email: Email): Promise<EmailSummary> {
    const prompt = buildSummaryPrompt(email);
    const response = await this.aiProvider.callLLM(prompt);
    return this.parseResponse(response);
  }

  private parseResponse(text: string): EmailSummary {
    // Strip markdown, parse JSON, validate schema
  }
}
```

---

## Technology Stack Confirmation

All technologies are already in use:

- **TypeScript 5.7**: ✅ Existing
- **Ink 4.x**: ✅ Existing (React for CLI)
- **@anthropic-ai/sdk**: ✅ Existing (AI provider)
- **openai**: ✅ Existing (Alternative AI provider)
- **better-sqlite3**: ✅ Existing (Database)
- **vitest**: ✅ Existing (Testing)

No new dependencies required.

---

## Implementation Approach

### Phase Order

1. **Database & Models** (Foundation)
   - Migration: Add `summary` column
   - Schema: Update EmailSchema
   - Repository: Update save/getById methods

2. **AI Integration** (Core Logic)
   - Prompt builder: `buildSummaryPrompt` function
   - Service: `SummaryService` class
   - Response parsing and validation

3. **UI Layer** (User Interface)
   - Remove global 's' shortcut
   - Add 's' handler to EmailDetail
   - Implement view toggle state
   - Add loading/error states
   - Render summary view

4. **Testing** (Verification)
   - Unit tests for each layer
   - Integration tests for full flow
   - Manual testing in TUI

### Critical Path

Database → Prompt Builder → Summary Service → UI Toggle → Testing

---

## Open Questions

None - all technical decisions resolved.

---

## References

- Feature spec: `/specs/006-glm-ai-summary/spec.md`
- Existing patterns:
  - Prompt building: `src/core/ai/prompt.ts`
  - AI provider: `src/core/ai/provider.ts`
  - Keyboard handling: `src/cli/hooks/use-keyboard.ts`
  - Database migrations: `src/core/persistence/migrations/`
  - Repository pattern: `src/core/services/email-repository.ts`
