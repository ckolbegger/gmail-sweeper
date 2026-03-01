# Implementation Plan: Email Detail Rendering Improvements

**Branch**: `003-minimax-email-detail-rendering` | **Date**: 2026-02-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-minimax-email-detail-rendering/spec.md`

## Summary

Improve email content rendering in the TUI detail pane by:
1. Collapsing multiple consecutive blank lines to max 2
2. Converting URLs to clickable/truncatable link text (50% pane width max)
3. Enabling clipboard copy of full original URLs
4. Enabling click-to-open URLs in browser (P3)

This is a TUI enhancement using React/Ink that modifies the existing EmailPreview component.

## Technical Context

**Language/Version**: TypeScript 5.4  
**Primary Dependencies**: React 18, Ink 4, googleapis (Gmail API)  
**Storage**: N/A (no persistence needed - runtime rendering only)  
**Testing**: Vitest  
**Target Platform**: Terminal/Console (Node.js CLI)  
**Project Type**: TUI (Terminal User Interface)  
**Performance Goals**: Render must complete in <16ms (60fps terminal refresh)  
**Constraints**: Must work within Ink's text rendering constraints; terminal width varies  
**Scale/Scope**: Single component modification; affects email detail view only  

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Safety & Security | ✅ PASS | Read-only rendering; no destructive operations |
| Strict TDD | ✅ PASS | Tests required before implementation |
| Modular Architecture | ✅ PASS | Pure rendering functions separated from EmailPreview |
| CLI Excellence | ✅ PASS | Maintains existing CLI patterns |
| Simplicity & YAGNI | ✅ PASS | Minimal changes to achieve requirements |

*No gates violated. Feature can proceed to research.*

## Project Structure

### Documentation (this feature)

```
specs/003-minimax-email-detail-rendering/
├── plan.md              # This file
├── research.md          # Phase 0 output (this plan command)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (if needed)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```
src/
├── tui/
│   ├── components/
│   │   ├── EmailPreview.tsx    # MODIFIED - main rendering component
│   │   └── UrlLink.tsx         # NEW - clickable URL component
│   └── hooks/
│       └── useUrlActions.ts     # NEW - clipboard & open browser
├── core/
│   └── rendering/
│       ├── index.ts            # NEW - exports
│       ├── blank-lines.ts      # NEW - blank line collapsing
│       ├── url-parser.ts       # NEW - URL detection & processing
│       └── text-truncator.ts   # NEW - width-based truncation

tests/
├── unit/
│   └── rendering/              # NEW - unit tests for rendering logic
│       ├── blank-lines.test.ts
│       ├── url-parser.test.ts
│       └── text-truncator.test.ts
└── integration/
    └── email-preview.test.ts   # MODIFIED - integration tests
```

**Structure Decision**: Single project structure. Adding new rendering utilities under `src/core/rendering/` to keep rendering logic separate from UI components (maintains modularity per Constitution).

## Complexity Tracking

> No complexity violations to track.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| N/A | - | - |

## Phase 0: Research

This feature has no external dependencies requiring research. All technologies (React, Ink, Vitest) are already in use.

**Research complete - no unknowns.**

## Phase 1: Design

### Data Model

**Input**: Email body text (string)  
**Output**: Processed body with collapsed blanks + URL placeholders  

```
ProcessedContent {
  lines: string[]              # Body lines with max 2 consecutive blanks
  urls: Map<lineIndex, UrlInfo> # Mapping of line positions to URL data
}

UrlInfo {
  originalUrl: string          # Full URL for clipboard/browser
  displayText: string          # Truncated display text (max 50% width)
  startIndex: number          # Position in line for highlighting
  endIndex: number            # Position in line for highlighting
}
```

### Key Design Decisions

1. **Blank Line Collapsing**: Replace 3+ consecutive newlines with exactly 2
2. **URL Detection**: Match http://, https://, www. prefixes using regex
3. **Truncation**: Calculate 50% of terminal width at render time; include "..." indicator
4. **URL Actions**: 
   - Copy: Use Ink's clipboard support or external package
   - Open: Use `open` package for cross-platform browser launch

### Contracts

No external API contracts needed. This is purely internal rendering logic.

### Quickstart

New developers need to understand:
1. EmailPreview component receives Email object with bodyText/bodyHtml
2. Rendering pipeline: raw body → process URLs → collapse blanks → render
3. UrlLink component handles click events for copy/open actions

---
*Plan complete. Ready for `/speckit.tasks` to generate task breakdown.*
