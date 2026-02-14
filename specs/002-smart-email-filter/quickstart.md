# Quickstart: Smart Email Filter

## Prerequisites

- US1 complete (inbox loads and displays)
- Node.js ≥20, TypeScript, Vitest
- An AI API key (Anthropic or OpenAI-compatible)

## Setup

1. Install OpenAI SDK:
   ```bash
   npm install openai
   ```

2. Add AI configuration to `.env`:
   ```bash
   # Option A: Anthropic
   AI_PROVIDER=anthropic
   AI_MODEL=claude-sonnet-4-5-20250929
   AI_API_KEY=sk-ant-...

   # Option B: OpenAI-compatible
   AI_PROVIDER=openai
   AI_MODEL=gpt-4o
   AI_API_KEY=sk-...
   AI_BASE_URL=https://api.openai.com/v1  # optional, defaults to OpenAI
   AI_MAX_CONTEXT_TOKENS=32000            # optional, default 32000
   ```

## Development Flow (TDD)

For each component:

1. Write failing test
2. Run `npx vitest run --reporter=verbose`
3. Write minimal code to pass
4. Refactor

## Architecture Overview

```
src/core/ai/
├── provider.ts          # AiProvider interface + factory
├── anthropic.ts         # Anthropic implementation
├── openai.ts            # OpenAI-compatible implementation
└── prompt.ts            # Classification prompt template

src/core/filter/
├── smart-filter.ts      # Batch evaluation orchestrator
└── index.ts             # Barrel export

src/tui/
├── hooks/useSmartFilter.ts  # Filter state management hook
├── components/FilterInput.tsx  # Text input component
└── app.tsx              # Updated with filter integration
```

## Key Patterns

- **Provider interface**: `AiProvider.classifyEmails(request)` — single method, batch input/output
- **Dynamic batches**: `runSmartFilter()` sizes batches by token budget (estimates `chars/4` per email, reserves 30% for prompt/response overhead), calls `onProgress` after each
- **Cancellation**: Pass `AbortSignal` to cancel in-flight evaluation
- **Error boundary**: AI errors caught and displayed, unfiltered view preserved

## Testing Strategy

- **Unit tests**: Mock `AiProvider` to test filter logic, batch splitting, confidence mapping
- **Unit tests**: Mock HTTP to test Anthropic/OpenAI provider implementations
- **Integration tests**: Full filter cycle (activate → evaluate → display → clear)
- **TUI tests**: ink-testing-library for component rendering with filter state
