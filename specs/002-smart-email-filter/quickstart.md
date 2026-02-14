# Quickstart: Smart Email Filter

## Prerequisites

- US1 complete (inbox loads and displays)
- Node.js >=20
- Gmail OAuth credentials already configured
- AI API key (Anthropic or OpenAI-compatible)

## Setup

1. Install dependencies:
   ```bash
   npm install
   npm install openai @anthropic-ai/sdk react @types/react ink-testing-library
   ```

2. Ensure TypeScript supports TSX in `tsconfig.json`:
   - `"jsx": "react-jsx"`

3. Create `.env.example` (or `.env`) entries:
   ```bash
   AI_PROVIDER=anthropic
   AI_MODEL=claude-sonnet-4-5-20250929
   AI_API_KEY=sk-ant-...

   # Optional for openai-compatible targets
   # AI_PROVIDER=openai
   # AI_MODEL=gpt-4o
   # AI_BASE_URL=https://api.openai.com/v1

   AI_MAX_CONTEXT_TOKENS=32000
   ```

## Development Flow (Strict TDD)

For each task:

1. Write a failing test.
2. Run targeted tests (example):
   ```bash
   npm test -- tests/unit/smart_filter_service.test.ts
   ```
3. Implement minimum code to pass.
4. Refactor with full suite green.

## Architecture Overview

```text
src/core/
├── config.ts                # App + AI config resolution
├── entities.ts              # Email/filter entities and types
└── errors.ts                # Domain/app errors including AI provider errors

src/adapters/ai/
├── provider.ts              # AiProvider interface + factory + confidence mapping
├── anthropic.ts             # Anthropic implementation
├── openai.ts                # OpenAI-compatible implementation
├── prompt.ts                # Classification prompt builder
└── index.ts                 # Exports

src/services/
├── batch_sizing.ts          # Token estimation + dynamic batch size
├── smart_filter_service.ts  # Batch orchestration + progress updates
└── index.ts                 # Exports

src/tui/
├── app.tsx                  # Ink app root with filter UI state
├── inbox_list.tsx           # Filtered list + confidence rendering
├── filter_input.tsx         # Filter description input
├── use_smart_filter.ts      # Filter state machine hook
├── input_controller.ts      # f / Esc / navigation key handling
└── ink_runtime.ts           # Ink renderer runtime lifecycle
```

## Testing Strategy

- Unit tests: provider/config/prompt/batch sizing/filter service
- Unit tests: TSX TUI components and hook logic with `ink-testing-library`
- Integration tests: full filter flow, clear flow, confidence flow
- Always run full suite before completion:
  ```bash
  npm run lint
  npm run build
  npm test
  ```
