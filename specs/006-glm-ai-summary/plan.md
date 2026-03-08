# Implementation Plan: AI Email Summary

**Branch**: `006-glm-ai-summary` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-glm-ai-summary/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add AI-powered email summary feature that allows users to toggle between full email view and AI-generated summary using the 's' key. Summaries follow a specific format (one sentence + bullet list of action items) and are persisted in the database to avoid redundant LLM calls. Reuses existing AI provider infrastructure (Anthropic/OpenAI).

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 20+  
**Primary Dependencies**: Ink 4.x (React for CLI), React 18.x, @anthropic-ai/sdk, openai, better-sqlite3  
**Storage**: SQLite via better-sqlite3 (existing database)  
**Testing**: Vitest (unit and integration tests)  
**Target Platform**: Node.js CLI application (Terminal/Console)
**Project Type**: Single project (CLI tool)
**Performance Goals**: Summary generation < 5 seconds for 95% of emails, cached summary retrieval < 100ms  
**Constraints**: LLM API rate limits, network latency for API calls, terminal UI responsiveness  
**Scale/Scope**: Per-email basis, single user, no concurrent email processing required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Safety & Security (NON-NEGOTIABLE)
✅ **PASS** - Feature is read-only by default. Summary generation doesn't modify email data in Gmail. Database writes are local only. No secrets logged.

### II. Strict Test-Driven Development (TDD)
✅ **PASS** - Will follow TDD workflow:
1. Unit tests for summary generation logic (mocked LLM)
2. Unit tests for keyboard handler and view toggle
3. Unit tests for database operations
4. Integration tests for end-to-end summary flow

### III. Modular Architecture
✅ **PASS** - Clear separation of concerns:
- **UI Layer**: EmailDetail component (keyboard handling, view toggle)
- **Service Layer**: Summary generation service (LLM integration)
- **Data Layer**: EmailRepository (summary persistence)
- **AI Layer**: Prompt builder and provider (existing infrastructure)

### IV. CLI Excellence
✅ **PASS** - Single key press ('s') to toggle, clear status messages, follows existing Ink patterns.

### V. Simplicity & YAGNI
✅ **PASS** - Implements only what's needed:
- Single summary format (no customization)
- User-initiated generation (no auto-generation)
- Database persistence (no complex caching)
- Reuses existing AI provider (no new infrastructure)

**Gate Status**: ✅ All gates passed. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/006-glm-ai-summary/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── summary-service.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── ai/
│   │   ├── prompt.ts              # Add buildSummaryPrompt function
│   │   └── provider.ts            # Extend AiProvider interface (optional)
│   ├── models/
│   │   └── validation.ts          # Add summary field to EmailSchema
│   ├── persistence/
│   │   └── migrations/
│   │       └── 003_add_summary_column.sql  # New migration
│   └── services/
│       ├── email-repository.ts    # Update save/getById for summary
│       └── summary-service.ts     # New: LLM summary generation
├── cli/
│   └── components/
│       └── email-detail.tsx       # Add 's' key handler and summary view

tests/
├── unit/
│   ├── cli/
│   │   └── email-summary.test.ts  # UI toggle tests
│   ├── core/
│   │   ├── summary-service.test.ts  # Summary generation tests
│   │   └── email-repository.test.ts  # Database operations tests
│   └── ai/
│       └── summary-prompt.test.ts   # Prompt builder tests
└── integration/
    └── email-summary-flow.test.ts   # End-to-end tests
```

**Structure Decision**: Single project structure. All code lives under `src/` with clear separation between core business logic (AI, models, services, persistence) and CLI interface (components). Tests mirror the source structure.

## Complexity Tracking

> No violations - all Constitution gates passed without requiring justification.
