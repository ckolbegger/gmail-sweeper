# Implementation Plan: Email Detail Rendering Improvements

**Branch**: `003-glm-email-detail-rendering` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-email-detail-rendering/spec.md`

## Summary

Improve email detail pane rendering by (1) collapsing excessive blank lines to max 2, (2) truncating URLs to half pane width with link text preference, and (3) adding keyboard shortcuts for URL cycling, copy, and browser open. Changes are display-only and integrate into existing `EmailDetail` component.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 20+
**Primary Dependencies**: Ink 4.x (React for CLI), React 18.x
**Storage**: N/A (display-only, no persistence)
**Testing**: Vitest with ink-testing-library
**Target Platform**: Linux/macOS terminal (CLI/TUI)
**Project Type**: Single project (src/cli/ + src/core/)
**Performance Goals**: URL detection <50ms for typical emails, no perceptible render delay
**Constraints**: Must handle Unicode/emoji display width correctly, no horizontal scrolling
**Scale/Scope**: Typical emails 1-50 URLs, bodies up to 10K characters

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | ✅ PASS | Display-only, no destructive actions |
| II. Strict TDD | ✅ PASS | Will write tests first for all new functions |
| III. Modular Architecture | ✅ PASS | Text processor in core/services, display in cli/components |
| IV. CLI Excellence | ✅ PASS | Keyboard shortcuts follow existing patterns |
| V. Simplicity & YAGNI | ✅ PASS | Minimal scope, no over-engineering |

## Project Structure

### Documentation (this feature)

```text
specs/003-email-detail-rendering/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── services/
│   │   └── email-content-processor.ts  # NEW: blank line collapse, URL detection
│   └── utils/
│       └── display-width.ts              # EXISTING: shared with email-detail.tsx
├── cli/
│   ├── components/
│   │   └── email-detail.tsx             # MODIFY: integrate processor, URL state
│   └── hooks/
│       └── use-keyboard.ts              # EXISTING: pattern for shortcuts

tests/
├── unit/
│   ├── core/
│   │   ├── email-content-processor.test.ts  # NEW
│   │   ├── clipboard-service.test.ts        # NEW
│   │   └── browser-service.test.ts          # NEW
│   └── cli/
│       ├── email-detail.test.ts             # EXISTING (extend)
│       └── email-detail-urls.test.ts        # NEW
└── integration/
    ├── email-detail-blank-lines.test.ts     # NEW (US1)
    ├── email-detail-url-display.test.ts     # NEW (US2)
    └── email-detail-url-cycling.test.ts     # NEW (US3)

**Structure Decision**: Single project structure. New text processing logic goes in `src/core/services/` (business logic layer), integrated into existing `EmailDetail` component in `src/cli/components/`.

## Complexity Tracking

> No constitution violations. Table not needed.
