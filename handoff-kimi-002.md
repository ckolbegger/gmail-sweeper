# Handoff Document: Gmail Sweep - Smart Email Filter

**Project**: Gmail Sweep CLI TUI Application  
**Feature**: 002-smart-email-filtering  
**Branch**: `002-kimi-smart-email-filtering`  
**Last Updated**: 2026-02-22  
**Status**: Phase 2 Implementation - AI Provider Stubs Need Implementation

---

## Session Summary

This session focused on implementing the Smart Email Filter feature (002) which allows users to filter emails using natural language descriptions via AI providers (Anthropic/OpenAI).

### What Was Completed

#### ✅ Core Infrastructure
- **Smart Filter Hook** (`src/cli/hooks/use-smart-filter.ts`)
  - State management for filter (idle/input/loading/filtered/error)
  - Integration with AI providers
  - Error handling and loading states
  
- **Smart Filter Core** (`src/core/filter/smart-filter.ts`)
  - Batch email classification logic
  - Token estimation and batch size calculation
  - Prompt building for AI classification
  - Error handling with abort support

- **AI Provider Interface** (`src/core/ai/provider.ts`)
  - `AiProvider` interface with `classifyEmails()` method
  - `createAiProvider()` factory for Anthropic/OpenAI
  - Confidence level mapping (high/medium/low)
  - **STUB IMPLEMENTATIONS** - AnthropicProvider and OpenAiProvider throw "Not implemented"

#### ✅ TUI Integration
- **FilterInput Component** (`src/cli/components/filter-input.tsx`)
  - Text input for natural language filter descriptions
  - Loading indicator during AI evaluation
  - Error message display
  - Escape key to cancel/clear

- **App.tsx Integration** (`src/cli/app.tsx`)
  - `f` key activates filter input
  - `Esc` clears filter and returns to full list
  - Filter description shown in header
  - Display filtered email count
  - Footer shows filter shortcuts

#### ✅ Sync Improvements
- **Email Count Estimate** (`src/core/services/gmail-client.ts`)
  - `getEmailCountEstimate()` method to preview sync size
  - Shows estimated count before sync starts

- **--since Flag** (`src/cli/index.ts`)
  - `gmail-sweep sync --since 7d` - last 7 days
  - `gmail-sweep sync --since 1w` - last week
  - `gmail-sweep sync --since 2024-01-01` - since specific date
  - Progress shows `current/total` (e.g., 22700/58751)

#### ✅ Bug Fixes
- **US1-bug-1**: Fixed silent error when AI not configured
  - FilterInput now shown on error state so users see error messages
  - Error: "AI configuration is missing. Please set AI_PROVIDER, AI_MODEL, and AI_API_KEY"

#### ✅ UI/UX Improvements
- **Split-pane Layout**: Email list (left) + preview (right) with vertical separator
- **Scrollable Preview**: `[` and `]` scroll preview by half viewport
- **Emoji Stripping**: Non-ASCII characters removed to prevent terminal alignment issues
- **Footer Updates**: Shows filter shortcuts (`f filter | Esc clear`)

---

## Current Status

### Test Results
```
Test Files: 29 passed (29)
Tests: 366 passed (366)
```

### What's Working
1. ✅ Gmail OAuth authentication
2. ✅ Email sync (full and incremental with --since flag)
3. ✅ TUI with split-pane layout
4. ✅ Email list with selection and preview
5. ✅ Filter input UI (activates with 'f' key)
6. ✅ Filter state management and error display
7. ✅ Progress reporting with total count

### What's NOT Working
1. ❌ **AI Classification** - The critical missing piece
   - `AnthropicProvider.classifyEmails()` throws "Not implemented"
   - `OpenAiProvider.classifyEmails()` throws "Not implemented"
   - When user submits a filter, they get "not implemented" error

---

## What Needs to Be Done (Priority Order)

### P0: Implement AI Provider Classifications (BLOCKING)

**Files to Modify:**
- `src/core/ai/provider.ts` - Replace stub implementations

**Requirements:**
1. **AnthropicProvider**
   - Use `@anthropic-ai/sdk` package
   - Call Claude API with classification prompt
   - Parse JSON response into `EmailClassification[]`
   - Handle errors gracefully

2. **OpenAiProvider**
   - Use `openai` package
   - Call OpenAI Chat Completions API
   - Parse JSON response into `EmailClassification[]`
   - Handle errors gracefully

3. **Prompt Building**
   - Already implemented in `src/core/ai/prompt.ts`
   - Uses `buildClassificationPrompt(filterDescription, emails)`
   - Returns `{ system: string, user: string }`

**Expected Response Format from AI:**
```json
[
  {
    "emailId": "abc123",
    "matches": true,
    "confidence": 0.95,
    "reasoning": "This is a newsletter about..."
  },
  ...
]
```

**Test Requirements:**
- Unit tests for provider with mocked clients
- Integration tests with real API calls (optional, may use mocks)
- Error handling tests (API failures, malformed responses)

### P1: Pagination for Email List (BUG-001 in tasks.md)

**Problem:** Only first 50 emails are displayed
**Solution:** Implement pagination with Ctrl+Up/Ctrl+Down

**Files:**
- `src/cli/app.tsx` - Add offset state, pagination keyboard handlers
- `src/core/services/email-repository.ts` - Support offset in list() query

### P2: Additional Filter Features

1. **Clear Filter Indicator** - Show when filter is active, make clear more obvious
2. **Filter Result Count** - "Showing 12 of 587 emails matching 'newsletters'"
3. **Empty State** - Better message when filter returns 0 results

### P3: Documentation & Polish

1. Update README with new features
2. Add example filter descriptions to help
3. Performance optimization for large email lists

---

## Technical Details

### AI Provider Interface

```typescript
export interface AiProvider {
  classifyEmails(
    filterDescription: string, 
    emails: EmailMetadata[]
  ): Promise<EmailClassification[]>;
}

export interface EmailMetadata {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  snippet: string;
}

export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number; // 0.0-1.0
  reasoning?: string;
}
```

### Environment Variables (Configured)

```bash
# Gmail OAuth
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost

# AI Provider (Anthropic configured)
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-5-20250929
AI_API_KEY=sk-ant-api03-...
AI_BASE_URL=https://api.anthropic.com
AI_MAX_CONTEXT_TOKENS=32000
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `src/core/ai/provider.ts` | **STUB** - Needs Anthropic/OpenAI implementations |
| `src/core/ai/prompt.ts` | Builds classification prompts |
| `src/core/filter/smart-filter.ts` | Batch classification orchestration |
| `src/cli/hooks/use-smart-filter.ts` | React hook for filter state |
| `src/cli/components/filter-input.tsx` | Filter input UI |
| `src/cli/app.tsx` | Main app with filter integration |

---

## Next Session Checklist

1. [ ] Review this handoff document
2. [ ] Run `npm run build` to verify current state
3. [ ] Run `npm run test:run` to confirm all tests pass
4. [ ] **Implement AnthropicProvider.classifyEmails()**
5. [ ] **Implement OpenAiProvider.classifyEmails()**
6. [ ] Test with real filter: `./gmail-sweep`, press `f`, type "newsletters"
7. [ ] If working, implement pagination (BUG-001)

---

## Design Decisions Made

1. **No JSX** - Using `React.createElement()` throughout for consistency
2. **Stub First** - AI providers implemented as stubs to unblock UI work
3. **TDD Required** - Tests must be written before implementation
4. **Debug Logging** - Use `debug.log` file for debugging (not console)
5. **Path Aliases Removed** - Using relative imports (e.g., `../../core/...`) for runtime compatibility

---

## Resources

- **Task List**: `specs/002-smart-email-filter/tasks.md`
- **Bug Task**: BUG-001 in tasks.md (pagination)
- **Spec**: `specs/002-smart-email-filter/spec.md`
- **Bug Report**: `specs/002-smart-email-filter/US1-bug-1.md` (fixed)

---

*Ready to implement AI provider classifications. The UI is complete and waiting for the backend to work.*
