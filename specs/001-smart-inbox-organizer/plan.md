# Implementation Plan: Smart Inbox Organizer

**Branch**: `001-smart-inbox-organizer` | **Date**: 2026-01-31 | **Spec**: [specs/001-smart-inbox-organizer/spec.md](./spec.md)
**Input**: Feature specification from `specs/001-smart-inbox-organizer/spec.md`

## Summary

Build a "Smart Inbox Organizer" CLI tool using a Rich TUI (Ink/React) that authenticates with Gmail, fetches emails (paginated), filters them using Natural Language (Gemini 3 Flash), and allows users to perform organized actions (Archive, Label, Delete) with safety confirmations. Workflows can be saved to a local JSON file.

## Technical Context

**Language/Version**: Node.js 20 LTS (TypeScript 5.3+)
**Primary Dependencies**: 
- `ink` (TUI Framework)
- `react` (UI Library)
- `googleapis` (Gmail API)
- `@google/generative-ai` (Gemini SDK)
- `zod` (Validation)
- `conf` or `fs` (Local persistence)
**Storage**: Local JSON file (`~/.config/gmail-sweep/workflows.json`)
**Testing**: `vitest` (Unit/Component tests), `ink-testing-library` (TUI tests)
**Target Platform**: Linux (CLI)
**Project Type**: Single project
**Performance Goals**: <3s startup, <5s NL filtering
**Constraints**: Gmail API rate limits, Console dimensions
**Scale/Scope**: Personal use, <100 saved workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Safety & Security**: The spec explicitly requires confirmation for destructive actions (FR-008). The architecture will enforce this in the `ActionService`.
- **Strict TDD**: The project will use `vitest` and `ink-testing-library` to test logic and UI components before implementation.
- **Modular Architecture**: Business logic (Gmail fetching, AI processing) will be separated from Ink components to support future web migration (FR-009).
- **CLI Excellence**: Ink provides a composable, modern CLI experience.
- **Simplicity**: Persistence is a simple JSON file, avoiding database overhead.

**Status**: PASSED

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-inbox-organizer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Internal interfaces)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── cli.tsx              # Entry point
├── app.tsx              # Root component
├── components/          # Reusable Ink components (InboxList, EmailDetail, etc.)
│   ├── Inbox/
│   ├── Workflows/
│   └── Shared/
├── hooks/               # Custom React hooks (useGmail, useWorkflow)
├── services/            # Pure business logic (decoupled from UI)
│   ├── gmail/           # Gmail API wrapper
│   ├── ai/              # Gemini integration
│   ├── workflow/        # Persistence logic
│   └── actions/         # Action execution (Archive/Label) with safety checks
├── types/               # Shared TypeScript interfaces
└── utils/               # Helpers

tests/
├── unit/                # Service logic tests
├── integration/         # Mocked Gmail/AI integration tests
└── components/          # Ink component tests (render output)
```

**Structure Decision**: Single project structure with `src/` containing both UI (`components`) and Logic (`services`), explicitly separated to satisfy the "future web app" decoupling requirement.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |