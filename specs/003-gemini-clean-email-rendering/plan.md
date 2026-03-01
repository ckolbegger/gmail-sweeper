# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS)
**Primary Dependencies**: React, Ink, html-to-text, open, clipboardy
**Storage**: N/A (View layer only)
**Testing**: Vitest, ink-testing-library
**Target Platform**: CLI / Terminal Emulator
**Project Type**: Single project (CLI App)
**Performance Goals**: Rendering under 200ms per email
**Constraints**: Terminal width constraints for link truncation (<= 50%)
**Scale/Scope**: Displaying single email content

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Safety & Security**: Passes. Read-only rendering changes. `open` and `clipboardy` don't expose credentials.
- **II. Strict Test-Driven Development (TDD)**: Required. Unit tests for parsing logic and TUI component interaction.
- **III. Modular Architecture**: Passes. Rendering logic separated into a parser utility.
- **IV. CLI Excellence**: Passes. Improves readability and interaction within the TUI.
- **V. Simplicity & YAGNI**: Passes. Minimal necessary packages (`open`, `clipboardy`) added.

## Project Structure

### Documentation (this feature)

```text
specs/003-gemini-clean-email-rendering/
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
├── components/
│   ├── Inbox/
│   │   └── EmailDetail.tsx    # Modify for interactivity and display
├── utils/
│   └── emailRenderer.ts       # New file for parsing and transforming body text
```

**Structure Decision**: Single project. Using existing `EmailDetail.tsx` and adding a new utility module for the pure string manipulation to keep logic testable.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
