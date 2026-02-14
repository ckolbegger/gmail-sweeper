# Implementation Plan: Smart Email Filter

**Branch**: `002-smart-email-filter` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-smart-email-filter/spec.md`

## Summary

Enable users to filter their inbox using natural language descriptions (e.g., "newsletters about investing"). An AI evaluates each email's metadata against the description and shows only matching results with confidence indicators. Supports configurable AI providers (Anthropic, OpenAI-compatible) with progressive batch evaluation (50 emails per batch).

## Technical Context

**Language/Version**: TypeScript 5.4 (strict mode, ES2022 target, ESM)
**Primary Dependencies**: Ink 4.0 (TUI), googleapis 130 (Gmail), @anthropic-ai/sdk 0.20, openai (to add)
**Storage**: sql.js 1.8 (SQLite email cache) — no new storage needed for this feature
**Testing**: Vitest 1.0, ink-testing-library, @testing-library/react
**Target Platform**: Node.js ≥20, terminal (TUI)
**Project Type**: Single project
**Performance Goals**: Filter results within 10s for 50 emails (SC-001), clear filter <1s (SC-003)
**Constraints**: Single LLM call per dynamically-sized batch (guarded by configurable token budget), progressive partial results
**Scale/Scope**: Inbox of 50–500 emails, evaluated in token-aware batches (default budget: 32k tokens)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | PASS | Read-only operation — filter only reads email metadata, never modifies. No secrets exposed (API keys from env vars). |
| II. Strict TDD | PASS | All components will be test-first. Contracts defined before implementation. |
| III. Modular Architecture | PASS | Clean separation: AI providers (core/ai), filter logic (core/filter), TUI hooks (tui/hooks). |
| IV. CLI Excellence | PASS | Keyboard shortcuts (f/Esc), clear status indicators, standard error reporting. |
| V. Simplicity & YAGNI | PASS | No saved filters, no streaming, no fine-tuning — only what spec requires. Provider abstraction is minimal (one method). |

**Post-Phase 1 Re-check**: Design maintains all passes. Provider interface has single method (`classifyEmails`). No over-abstraction.

## Project Structure

### Documentation (this feature)

```text
specs/002-smart-email-filter/
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: development guide
├── contracts/           # Phase 1: TypeScript interfaces
│   ├── ai-provider.ts   # AiProvider interface + types
│   └── smart-filter.ts  # Filter orchestrator contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── ai/                    # NEW: AI provider abstraction
│   │   ├── provider.ts        # AiProvider interface + factory
│   │   ├── anthropic.ts       # Anthropic SDK implementation
│   │   ├── openai.ts          # OpenAI-compatible implementation
│   │   ├── prompt.ts          # Classification prompt template
│   │   └── index.ts           # Barrel export
│   ├── filter/                # NEW: Smart filter logic
│   │   ├── smart-filter.ts    # Batch evaluation orchestrator
│   │   └── index.ts           # Barrel export
│   ├── models/index.ts        # MODIFY: update Config, add filter types
│   ├── config.ts              # MODIFY: add AI config resolution
│   ├── gmail/                 # EXISTING: unchanged
│   └── cache/                 # EXISTING: unchanged
├── tui/
│   ├── hooks/
│   │   ├── useSmartFilter.ts  # NEW: filter state management
│   │   └── useKeyboard.ts     # MODIFY: add 'f' and Escape handlers
│   ├── components/
│   │   ├── FilterInput.tsx    # NEW: text input for filter description
│   │   ├── EmailList.tsx      # MODIFY: confidence indicators
│   │   └── EmailPreview.tsx   # EXISTING: unchanged
│   └── app.tsx                # MODIFY: integrate filter UI
└── cli/index.ts               # EXISTING: unchanged

tests/
├── unit/
│   ├── ai/                    # NEW: provider + prompt tests
│   ├── filter/                # NEW: smart filter logic tests
│   └── tui/                   # MODIFY: filter component tests
└── integration/               # NEW: full filter cycle tests
```

**Structure Decision**: Extends existing single-project structure. New modules `src/core/ai/` and `src/core/filter/` follow the established `src/core/` pattern for business logic. TUI changes extend existing hooks and components.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
