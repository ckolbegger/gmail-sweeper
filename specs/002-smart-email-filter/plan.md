# Implementation Plan: Smart Email Filter

**Branch**: `002-smart-email-filter` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-smart-email-filter/spec.md`

## Summary

Enable users to filter their inbox using natural language descriptions (e.g., "newsletters about investing"). An AI evaluates each email's metadata against the description and shows only matching results with confidence indicators. Supports configurable AI providers (Gemini, Anthropic, OpenAI-compatible) with progressive batch evaluation.

## Technical Context

**Language/Version**: Node.js 20 LTS (TypeScript 5.3+)
**Primary Dependencies**: 
- `ink` (TUI Framework)
- `react` (UI Library)
- `googleapis` (Gmail API)
- `@google/generative-ai` (Gemini SDK)
- `@anthropic-ai/sdk` (Anthropic SDK)
- `openai` (OpenAI SDK)
- `zod` (Validation)
**Storage**: Local JSON file (`~/.config/gmail-sweep/workflows.json`)
**Testing**: `vitest`, `ink-testing-library`
**Target Platform**: Linux (CLI)
**Project Type**: Single project
**Performance Goals**: Filter results within 10s for 50 emails (SC-001), clear filter <1s (SC-003)
**Constraints**: Single LLM call per dynamically-sized batch, progressive partial results
**Scale/Scope**: Inbox of 50–500 emails, evaluated in token-aware batches

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | PASS | Read-only operation — filter only reads email metadata, never modifies. No secrets exposed (API keys from env vars). |
| II. Strict TDD | PASS | All components will be test-first. Contracts defined before implementation. |
| III. Modular Architecture | PASS | Clean separation: AI providers (services/ai), filter logic (services/filter), Ink hooks (hooks). |
| IV. CLI Excellence | PASS | Keyboard shortcuts (f/Esc), clear status indicators, standard error reporting. |
| V. Simplicity & YAGNI | PASS | No saved filters, no streaming — only what spec requires. Provider abstraction is minimal. |

**Status**: PASSED

## Project Structure

### Documentation (this feature)

```text
specs/002-smart-email-filter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── ai-provider.ts   # AiProvider interface + types
│   └── smart-filter.ts  # Filter orchestrator contract
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── index.tsx            # Entry point
├── app.tsx              # Root component
├── components/          # Reusable Ink components
│   ├── Inbox/
│   ├── Shared/
│   │   └── FilterInput.tsx    # NEW
│   └── ...
├── hooks/
│   ├── useGmail.ts            # MODIFY: add filter support
│   └── useSmartFilter.ts      # NEW
├── services/
│   ├── ai/                    # NEW: AI provider abstraction
│   │   ├── provider.ts        # AiProvider interface + factory
│   │   ├── gemini.ts          # Gemini implementation
│   │   ├── anthropic.ts       # Anthropic implementation
│   │   ├── openai.ts          # OpenAI implementation
│   │   └── prompt.ts          # Classification prompt template
│   ├── filter/                # NEW: Smart filter logic
│   │   └── smartFilter.ts     # Batch evaluation orchestrator
│   └── ...
├── types/
│   ├── index.ts               # MODIFY: update domain types
│   └── interfaces.ts          # MODIFY: update service interfaces
└── utils/

tests/
├── unit/
│   ├── services/ai/           # NEW
│   ├── services/filter/       # NEW
│   └── components/            # NEW component tests
└── integration/
    └── filter-flow.test.tsx   # NEW
```

**Structure Decision**: Extends existing single-project structure. New modules `src/services/ai/` and `src/services/filter/` follow the established service pattern. TUI changes extend existing components and hooks.

## Complexity Tracking

No violations.
