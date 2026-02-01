# Implementation Plan: Smart Inbox Organizer

**Branch**: `001-smart-inbox-organizer-openai` | **Date**: February 1, 2026 | **Spec**: `specs/001-smart-inbox-organizer/spec.md`
**Input**: Feature specification from `/specs/001-smart-inbox-organizer/spec.md`

## Summary

Deliver a TUI-first Gmail inbox organizer that supports filtering, natural-language queries, email preview, and bulk actions with explicit confirmation. Implement a modular local application with a core domain layer and adapters for TUI/CLI, persisting only saved queries and session metadata while avoiding email content retention. Plan for a local web app fast follow that runs as a single local process serving both UI and API against the same core services.

## Technical Context

**Language/Version**: Node.js 20 + TypeScript 5.x
**Primary Dependencies**: Ink (TUI), googleapis (Gmail access)
**Storage**: Local SQLite file for saved queries and session metadata (no email content stored)
**Testing**: Vitest
**Target Platform**: Local desktop (macOS/Linux/Windows)
**Project Type**: single
**Performance Goals**: Initial inbox list appears within 2 seconds in 90% of sessions
**Constraints**: Read-only by default; destructive actions require explicit confirmation; no email content retention; least-privilege Gmail access; web app must run as a single local process
**Scale/Scope**: Single user, single inbox per session; handle inboxes up to 100k messages via pagination

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Safety & Security**: PASS — destructive actions require explicit confirmation; least-privilege access; no credential logging.
- **Strict TDD**: PASS — plan includes unit/integration testing with test-first workflow.
- **Modular Architecture**: PASS — core domain services separated from TUI/CLI and Gmail adapter.
- **CLI Excellence**: PASS — TUI/CLI interface with clear errors and standard exit codes.
- **Simplicity & YAGNI**: PASS — MVP is TUI-only; local web app deferred to fast follow.

### Constitution Check (Post-Design)

- **Safety & Security**: PASS — no retention of email content; explicit confirmation remains required.
- **Strict TDD**: PASS — tests required for unit and integration layers.
- **Modular Architecture**: PASS — core/services/adapters/TUI separation preserved.
- **CLI Excellence**: PASS — TUI/CLI remains primary interface with clear error handling.
- **Simplicity & YAGNI**: PASS — post-MVP web app remains deferred.

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-inbox-organizer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── core/                # Domain models and business rules
├── services/            # Query, filtering, action orchestration
├── adapters/
│   ├── gmail/           # Gmail API integration
│   └── storage/         # Local persistence (saved queries/session)
├── tui/                 # TUI presentation layer
└── cli/                 # CLI entrypoints and commands

tests/
├── unit/
├── integration/
└── contract/
```

**Structure Decision**: Single-project layout with clear separation between core domain logic, adapters, and TUI/CLI interfaces.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
