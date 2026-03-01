# Research: Email Detail Rendering Improvements

**Feature**: Email Detail Rendering (003-minimax-email-detail-rendering)
**Date**: 2026-02-28

## Research Summary

No external research required. All technologies are already established in the project:

- **TypeScript**: Standard language for this project
- **React/Ink**: Already used for TUI components
- **Vitest**: Already used for testing
- **URL handling**: Standard JavaScript/TypeScript capabilities

## Decisions Made

### 1. Blank Line Collapsing

**Decision**: Simple regex-based replacement of 3+ consecutive newlines with 2

**Rationale**: Straightforward text processing; no external libraries needed. Maintains single blank line between paragraphs.

**Alternatives considered**: 
- Library-based whitespace normalization (rejected - adds dependency)
- Preserving original blank count up to 2 (rejected - user explicitly wants max 2)

### 2. URL Display Text

**Decision**: Extract domain/path for display; truncate to 50% terminal width

**Rationale**: Domain is most meaningful to users; path adds context. Truncation prevents layout breaking.

**Alternatives considered**:
- Show full URL (rejected - defeats purpose of feature)
- URL shortening service (rejected - adds external dependency, privacy concerns)

### 3. URL Actions (Copy/Open)

**Decision**: Use `open` package for browser launch; clipboard API for copy

**Rationale**: 
- `open` package is well-maintained, cross-platform
- Ink/React has no built-in clipboard - use `@clipboardy/clipboardy` or Node's `util.exec`

**Alternatives considered**:
- Manual child_process spawn (rejected - more error-prone)
- Custom clipboard implementation (rejected - unnecessary complexity)

---

*Research complete. No unresolved questions.*
