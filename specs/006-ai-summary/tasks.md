# Tasks: AI Summary Refactoring

**Feature**: 006-ai-summary  
**Status**: In Progress  
**Last Updated**: 2026-03-07

## Overview

Refactoring tasks to improve the AI Summary feature after initial implementation. These tasks address technical debt, missing features, and testing gaps.

---

## Phase 1: Data Persistence (P1)

### R001: Persist Summaries to SQLite Cache

**Description**: Summaries are currently stored only in React state (memory), which means they're lost when the app restarts. Each time a user views an email summary, the LLM is called again even if a summary was previously generated.

**Changes Needed**:

1. After `generateSummary()` in `useAISummary.ts` successfully returns, call `cache.upsertEmails()` to persist the summary
2. When loading emails in `useGmail.ts`, ensure cached summaries are included in the returned email objects
3. The `EmailCache.upsertEmails()` method in `src/core/cache/db.ts` already supports the `summary_json` column - verify it's being used

**Files to Modify**:

- `src/tui/hooks/useAISummary.ts` - Add cache persistence after successful generation
- `src/tui/hooks/useGmail.ts` - Ensure cached summaries are loaded with emails

**Test Approach**:

- Mock the cache and verify `upsertEmails` is called with the summary data
- Verify emails loaded from cache include summaries

---

## Phase 2: User Experience (P2, P5)

### R002: Show Loading Indicator While Generating Summary

**Description**: When the user presses 's', there's no visual feedback that a summary is being generated. The LLM call can take several seconds.

**Changes Needed**:

1. In `useAISummary.ts`, expose a `summaryState` that includes 'loading'
2. In `app.tsx`, display a loading message or spinner in the preview panel when `summaryState === 'loading'`
3. Consider adding "Generating summary..." text similar to how filter shows "Filtering..."

**Files to Modify**:

- `src/tui/hooks/useAISummary.ts` - Already has `summaryState`, ensure it's exposed correctly
- `src/tui/app.tsx` - Add conditional rendering for loading state in EmailPreview

**Test Approach**:

- Test that loading state is set during generation and cleared after

### R003: Handle HTML Body in Summary Generation

**Description**: The current implementation only uses `email.bodyText` for summarization. Many emails have HTML-only bodies, which would result in empty content being sent to the LLM.

**Changes Needed**:

1. In `useAISummary.ts`, convert HTML to text if only `bodyHtml` is available
2. Use the existing `convertHtmlToText()` from `src/core/rendering/index.js`
3. Ensure the converted text is passed to the LLM instead of empty string

**Files to Modify**:

- `src/tui/hooks/useAISummary.ts` - Add HTML to text conversion
- Import `convertHtmlToText` from `src/core/rendering/index.js`

**Test Approach**:

- Test with email that has only `bodyHtml` - verify text is converted

### R004: Abort Previous Summary Generation on Email Change

**Description**: If a user presses 's' to generate a summary, then quickly navigates to another email, the previous LLM call should be aborted to avoid race conditions.

**Changes Needed**:

1. In `useAISummary.ts`, store the current abort controller
2. When `generateSummary` is called again, abort any in-flight request first
3. In `app.tsx`, when `selectedEmail` changes, call abort before generating new summary

**Files to Modify**:

- `src/tui/hooks/useAISummary.ts` - Ensure abort controller is properly managed

**Test Approach**:

- Test that abort is called when switching emails mid-generation

### R005: Wait for Summary Before Showing Summary View

**Description**: Currently the view toggles immediately when 's' is pressed, even if the LLM hasn't finished. This causes a flash of "No summary available" before the summary appears.

**Changes Needed**:

1. In `app.tsx`, only toggle `showSummary` to true AFTER the summary is successfully generated
2. If generation fails, show an error message but don't toggle the view
3. The user experience should be: press 's' → see loading → see summary (or error)

**Files to Modify**:

- `src/tui/app.tsx` - Modify `toggleSummary` callback

**Test Approach**:

- Test that view only shows summary after successful generation

---

## Phase 3: Code Quality (P6, P7)

### R006: Fix Inline Type Imports in app.tsx

**Description**: Currently using inline `import('../core/models/index.js')` for types in app.tsx. This is a code smell.

**Changes Needed**:

1. Add proper imports at the top of `app.tsx`:
   ```typescript
   import type { Email, EmailSummary } from '../core/models/index.js';
   ```
2. Remove inline type references from `useRef` and `Map` declarations

**Files to Modify**:

- `src/tui/app.tsx` - Clean up imports

**Test Approach**: None needed - refactor only

### R007: Extract Shared AI Provider Configuration Utility

**Description**: The AI provider config creation logic is duplicated in both `useSmartFilter.ts` and `useAISummary.ts`. This should be a shared utility.

**Changes Needed**:

1. Create a new file `src/core/ai/provider-utils.ts`
2. Extract the common config building logic:
   ```typescript
   export function createProviderConfig(config: ResolvedAiConfig): ProviderConfig {
     const providerConfig: ProviderConfig = {
       provider: config.provider,
       model: config.model,
       apiKey: config.apiKey,
       maxContextTokens: config.maxContextTokens,
     };
     if (config.baseUrl) {
       providerConfig.baseUrl = config.baseUrl;
     }
     return providerConfig;
   }
   ```
3. Import and use in both hooks
4. Add unit tests for the utility

**Files to Create**:

- `src/core/ai/provider-utils.ts` - New utility file

**Files to Modify**:

- `src/tui/hooks/useSmartFilter.ts` - Use shared utility
- `src/tui/hooks/useAISummary.ts` - Use shared utility

**Test Approach**:

- Create `tests/unit/ai/provider-utils.test.ts` following the pattern in `tests/unit/ai/config.test.ts`
- Test that config is correctly built for both Anthropic and OpenAI

---

## Phase 4: Testing (P8, P9)

### R008: Add Unit Tests for useAISummary Hook

**Description**: The `useAISummary` hook has no unit tests. Add comprehensive tests following the pattern in `tests/unit/tui/useSmartFilter.test.ts`.

**Tests to Write**:

1. **Initial state**: Verify `summaryState` is 'idle' and `summaryError` is null
2. **With existing summary**: If email already has summary, return it immediately without calling LLM
3. **No body content**: If email has no bodyText or bodyHtml, set error state
4. **Missing config**: If AI config is not found, set error state
5. **Successful generation**: Verify summary is returned and state changes to 'success'
6. **Generation error**: Verify error is caught and state changes to 'error'
7. **Abort handling**: Verify state resets when request is aborted

**Files to Create**:

- `tests/unit/tui/useAISummary.test.ts` - Follow pattern from `useSmartFilter.test.ts`

**Mock Requirements**:

- Mock `resolveAiConfig` from `src/core/ai/config.js`
- Mock `createAiProvider` from `src/core/ai/provider.js`
- Use `vi.mock()` to replace with mock providers

**Test Approach**:

- Use `@testing-library/react` with `renderHook`
- Use `act()` for state changes
- Mock the provider's `generateSummary` method

### R009: Add Unit Tests for Summary Prompt Builder

**Description**: The `buildSummaryPrompt` function in `prompt.ts` has no unit tests. Add tests following the pattern in `tests/unit/ai/prompt.test.ts`.

**Tests to Write**:

1. **Valid email**: Verify prompt contains subject, sender, and body
2. **JSON format**: Verify the system prompt instructs AI to return JSON
3. **Format requirements**: Verify prompt specifies one-sentence summary + action items
4. **Timestamp**: Verify prompt asks for ISO format timestamp
5. **Empty body**: Test with empty body string - should still work

**Files to Modify**:

- `tests/unit/ai/prompt.test.ts` - Add tests for `buildSummaryPrompt`

**Test Approach**:

- Import `buildSummaryPrompt` and verify output structure
- Use `toContain()` for substring checks
- Parse the output to verify it's valid prompt format

---

## Dependencies

- **R001** → Requires understanding of existing cache implementation
- **R007** → Should be completed before R008 (useAISummary tests will use the utility)
- **R002-R005** → All modify `app.tsx` or `useAISummary.ts`, can be done in parallel

---

## Completion Criteria

- [x] R001: Summaries persist across app restarts
- [x] R002: Loading indicator shows during generation
- [x] R003: HTML emails are properly summarized
- [x] R004: No race conditions on email navigation
- [x] R005: Summary view only shows after generation
- [x] R006: No inline type imports
- [ ] R007: Shared provider utility with tests
- [ ] R008: useAISummary has ≥7 unit tests
- [ ] R009: buildSummaryPrompt has ≥5 unit tests
