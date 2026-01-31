# Implementation Plan: Smart Inbox Organizer

**Branch**: `001-smart-inbox-organizer` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-smart-inbox-organizer/spec.md`

## Summary

A Terminal User Interface (TUI) application to view, filter (via Natural Language), and organize Gmail inboxes. Built with **TypeScript** and **Ink** to maximize code sharing with a future React web application.

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS)
**Primary Dependencies**: 
- UI: `ink` (React for CLI)
- Data/Validation: `zod`
- AI: `openai` (SDK), `@google/generative-ai`
- Gmail: `googleapis` (Official Node.js client)
**Storage**: `better-sqlite3` (Local cache)
**Testing**: `vitest` (Unit/Integration)
**Target Platform**: POSIX (Linux/macOS)
**Project Type**: CLI/TUI (React-based)
**Performance Goals**: Launch < 3s, Filter < 5s
**Constraints**: OAuth2 auth flow in terminal, Read-only default safety

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Safety**: `SafetyService` wrapper for all destructive actions.
- **TDD**: `vitest` setup is fast and supports React component testing (`ink-testing-library`).
- **Modular**: Clear separation:
    - `src/core` (Business Logic/Hooks) -> **Shared with Web**
    - `src/tui` (Ink Components) -> **TUI Specific**
    - `src/adapters` (API Calls) -> **Shared with Web**
- **CLI Excellence**: `ink` provides a component-based, composable UI.
- **Simplicity**: Single language for full stack.

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-inbox-organizer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── core/               # Shared Business Logic
│   ├── models/
│   ├── services/
│   └── hooks/          # React Hooks (useInbox, useFilter)
├── adapters/           # External integrations
│   ├── gmail/
│   └── llm/
├── tui/                # Ink Components
│   ├── screens/
│   └── components/
├── cli.tsx             # Entry point
└── config.ts

tests/
├── contract/           # Adapter contract tests
├── integration/        # Workflow tests
└── unit/               # Core logic tests
```

**Structure Decision**: Monorepo-ready structure. `core` and `adapters` are framework-agnostic (or React-agnostic), `hooks` are React-shared. `tui` is specific.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| React/Ink Stack | To enable code sharing with future Web App | Python/Textual would require full UI rewrite for Web |
