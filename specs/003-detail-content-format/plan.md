# Implementation Plan: Detail Pane Content Formatting

**Branch**: `003-claude-detail-content-format` | **Date**: 2026-02-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-detail-content-format/spec.md`

## Summary

Improve email body readability in the TUI detail pane by: (1) collapsing runs of 3+ consecutive blank lines to exactly 2, and (2) replacing raw URLs with link text or truncated display strings capped at half the pane width. Optionally adds keyboard-driven URL focus/copy/open (P3). All body-processing logic extracted into a new `src/core/text/body-formatter.ts` pure-function module; `EmailPreview.tsx` updated to consume it with a new `paneWidth` prop.

## Technical Context

**Language/Version**: TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`)
**Primary Dependencies**: Ink 4.0 (TUI rendering), React 18 (Ink substrate), ink-testing-library 3.0 (component tests)
**Storage**: N/A — read-only display feature
**Testing**: Vitest 1.0 + ink-testing-library 3.0; test command `npm test`
**Target Platform**: Linux/macOS terminal (Node.js 18+, standard xterm/tmux/iTerm2)
**Performance Goals**: All transforms synchronous and sub-millisecond; no perceptible render delay
**Constraints**: No network calls during body rendering; no new npm dependencies required; must not break `wrap="truncate"` Ink behaviour
**Scale/Scope**: Per-email rendering; email bodies up to ~10k lines handled gracefully

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | ✅ Pass | Read-only display — no writes, no credentials touched |
| II. Strict TDD | ✅ Pass | All new functions in `body-formatter.ts` require failing tests first; `EmailPreview` changes require updated tests |
| III. Modular Architecture | ✅ Pass | New `src/core/text/` module separates text processing from UI rendering |
| IV. CLI Excellence | ✅ Pass | No CLI interface changes |
| V. Simplicity & YAGNI | ✅ Pass | No external libraries added; URL resolution (network) explicitly out of scope |

**Post-design re-check**: No violations introduced. Complexity table not required.

## Project Structure

### Documentation (this feature)

```text
specs/003-detail-content-format/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── body-formatter.ts          ← module interface
│   └── EmailPreview.props.ts      ← updated component props
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code

```text
src/
├── core/
│   └── text/
│       └── body-formatter.ts      ← NEW: pure transform functions
└── tui/
    └── components/
        └── EmailPreview.tsx       ← MODIFIED: consumes formatter, adds URL focus

tests/
└── unit/
    ├── core/
    │   └── text/
    │       └── body-formatter.test.ts   ← NEW: unit tests for all transforms
    └── tui/
        └── EmailPreview.test.tsx        ← EXTENDED: new rendering scenarios
```

**Structure Decision**: Single-project layout (existing pattern). New `src/core/text/` subdirectory follows established convention of `src/core/<domain>/` modules.

## Phase 0: Research

See [research.md](research.md) — all NEEDS CLARIFICATION items resolved.

**Key decisions:**
- New pure-function module `src/core/text/body-formatter.ts` (not inline in component)
- Sentinel `[text](url)` pattern for HTML link extraction before tag stripping
- Regex `https?://[^\s<>"]+` for plain-text URL detection (truncate only, no substitution)
- `truncateToHalfWidth` = `Math.floor(paneWidth / 2)` columns with `…`
- URL focus state local to `EmailPreview` with `useInput`; Tab/Shift-Tab/c/o bindings

## Phase 1: Design & Contracts

See [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md).

### Transform Pipeline Summary

```
rawBody (HTML or plain text)
  → [HTML only] extract <a> → sentinel [text](url)
  → [HTML only] strip tags + decode entities
  → split('\n')
  → collapseBlankLines()          ← FR-001
  → substituteLinks(paneWidth)    ← FR-002 / FR-003 / FR-004
  → BodyProcessingResult { lines: ProcessedLine[], allLinks: LinkInfo[] }
```

### Component Changes Summary

**`EmailPreview.tsx`** additions:
- Accept `paneWidth?: number` prop (default 80)
- Call `processEmailBody(rawBody, isHtml, paneWidth)` instead of the current inline `htmlToText` + `body.split('\n')`
- Local state: `focusedLinkIndex: number | null` (reset on email change)
- `useInput` handler: Tab → next link, Shift-Tab → prev link, `c` → clipboard, `o` → browser
- Render: focused URL rendered with Ink `inverse` highlight; scroll indicator updated to show `[tab] next url` hint when links exist
