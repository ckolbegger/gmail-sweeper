# Research: Email Detail Rendering Improvements

**Feature**: 003-email-rendering
**Date**: 2026-02-28

## R1: Blank-Line Normalization Strategy

**Decision**: Treat whitespace-only lines as blank and collapse every blank-line run (including leading/trailing runs) to at most two blank lines.

**Rationale**:
- Directly satisfies FR-001, FR-001a, and FR-001b.
- Preserves visual paragraph separation while removing excessive vertical gaps.
- Deterministic behavior simplifies tests for mixed line endings and edge cases.

**Alternatives Considered**:
- Collapse interior runs only and preserve original leading/trailing runs.
- Trim all leading/trailing blank runs to zero.
- Treat only empty-string lines as blank (rejected because whitespace-only noise would leak through).

## R2: URL Detection and Boundary Handling

**Decision**: Detect `http://` and `https://` URLs in rendered detail text and exclude trailing punctuation (`.`, `,`, `;`, `:`, `!`, `?`, `)`, `]`) from matched URLs.

**Rationale**:
- Aligns with FR-003 and FR-003a.
- Prevents broken link token display caused by sentence punctuation.
- Keeps parser implementation lightweight and robust for terminal text bodies.

**Alternatives Considered**:
- Include trailing punctuation in URL match (hurts readability and correctness).
- Complex context-sensitive parser for all bracket nesting rules (unnecessary for current scope).

## R3: Readable Link Token Source

**Decision**: Use anchor text when available in source text representation; otherwise use URL hostname as display token.

**Rationale**:
- Matches clarified requirement and acceptance criteria.
- Provides readable, compact display even for very long URLs.
- Works for plain-text messages where anchor metadata is usually absent (hostname fallback).

**Alternatives Considered**:
- Always display hostname only.
- Display hostname plus path segment by default.
- Display full URL minus protocol.

## R4: Truncation Rule for Link Tokens

**Decision**: Cap displayed link token length to `floor(detailPaneWidth / 2)` with a minimum cap of 12 characters. If truncated, ellipsis is included within the cap.

**Rationale**:
- Satisfies FR-004/FR-004a/FR-004b and SC-002.
- Avoids very short unreadable tokens in narrow panes.
- Fully deterministic rule enables precise test fixtures.

**Alternatives Considered**:
- `ceil(width/2)` cap.
- No minimum length.
- Fixed-width truncation independent of pane width.

## R5: Layering and Scope Boundaries

**Decision**: Keep formatting as pure TUI-layer utilities and avoid data-layer or adapter changes; defer URL mapping persistence and copy/open interactions.

**Rationale**:
- Aligns with constitution modularity and YAGNI.
- Keeps feature focused on rendering quality only.
- Reduces regression risk in Gmail retrieval and navigation state machinery.

**Alternatives Considered**:
- Add full interaction model now (copy/open URL) requiring mapping persistence.
- Push formatting into Gmail adapter (rejected as cross-layer coupling).
