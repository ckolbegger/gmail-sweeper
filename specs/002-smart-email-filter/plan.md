# Implementation Plan: Smart Email Filter

**Branch**: `002-smart-email-filter` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-smart-email-filter/spec.md`

## Summary

Enable users to filter their inbox using natural language descriptions (for example, "newsletters about investing"). An AI evaluates loaded email metadata against the description and shows matching results with confidence indicators. The feature supports configurable AI providers (Anthropic and OpenAI-compatible) with progressive, token-aware batch evaluation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ES2022 target, ESM)
**Primary Dependencies**: Ink 5.x (TUI), React 18 (TSX UI), googleapis 130 (Gmail), @anthropic-ai/sdk (to add), openai (to add)
**Storage**: No new persistent storage required for this feature
**Testing**: Vitest 1.x, ink-testing-library (to add)
**Target Platform**: Node.js >=20, terminal (TUI)
**Project Type**: Single project
**Performance Goals**: Filter results within 10s for 50 emails (SC-001), clear filter <1s (SC-003)
**Constraints**: Single LLM call per dynamically sized batch, configurable token budget, progressive partial results
**Scale/Scope**: Inbox of 50-500 loaded emails, evaluated in token-aware batches (default budget: 32k tokens)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | PASS | Read-only operation. Filter evaluates metadata only and never modifies Gmail state. |
| II. Strict TDD | PASS | Tests-first task sequencing is preserved. |
| III. Modular Architecture | PASS | Uses existing separation: `core` (types/config/errors), `adapters` (provider I/O), `services` (business logic), `tui` (presentation). |
| IV. CLI Excellence | PASS | Keyboard shortcuts (`f`, `Esc`) and explicit status/error output in TUI. |
| V. Simplicity & YAGNI | PASS | No saved filters or streaming; single provider interface and batch orchestrator only. |

**Post-Phase 1 Re-check**: Design remains compliant with all principles.

## Project Structure

### Documentation (this feature)

```text
specs/002-smart-email-filter/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ai-provider.ts
│   └── smart-filter.ts
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── config.ts               # MODIFY: add AI config resolution
│   ├── entities.ts             # MODIFY: add filter/classification types as needed
│   └── errors.ts               # MODIFY: add AiProviderError
├── adapters/
│   ├── ai/                     # NEW: AI provider implementations
│   │   ├── provider.ts
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   ├── prompt.ts
│   │   └── index.ts
│   ├── gmail/                  # EXISTING
│   └── storage/                # EXISTING
├── services/
│   ├── smart_filter_service.ts # NEW: filter orchestration
│   ├── batch_sizing.ts         # NEW: token estimate + batch sizing
│   └── index.ts                # NEW: barrel exports for services
├── tui/
│   ├── app.tsx                 # MODIFY (migrate from app.ts)
│   ├── inbox_list.tsx          # MODIFY (migrate from inbox_list.ts)
│   ├── filter_input.tsx        # NEW
│   ├── use_smart_filter.ts     # NEW
│   ├── input_controller.ts     # MODIFY: filter keyboard actions
│   └── ink_runtime.ts          # MODIFY: render TSX Ink app
└── cli/
    └── index.ts                # EXISTING

tests/
├── unit/
│   ├── ai_*.test.ts            # NEW: provider/config/prompt tests
│   ├── smart_filter_*.test.ts  # NEW: service tests
│   └── *_filter*.test.tsx      # NEW: TSX TUI tests
├── integration/
│   └── smart_filter_*.test.ts  # NEW: end-to-end filter flows
└── contract/
    └── ...                     # EXISTING + new smart filter contracts as needed
```

**Structure Decision**: Strictly aligned to this worktree's existing architecture (`core`, `adapters`, `services`, `tui`). The feature intentionally introduces TSX-based Ink UI and `ink-testing-library` while preserving existing module boundaries.

## Complexity Tracking

No constitution violations. No complexity exceptions required.
