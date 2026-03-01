# Implementation Plan: Email Detail Rendering Improvements

**Branch**: `003-codex-clean-email-rendering` | **Date**: 2026-02-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-email-rendering/spec.md`

## Summary

Improve readability of the email detail pane by normalizing whitespace and replacing raw URLs with compact readable link tokens. Rendering rules are deterministic: blank-line runs collapse to at most two lines; URL display text uses anchor text when available, otherwise hostname; display length is capped at `floor(width/2)` with a minimum of 12 characters and ellipsis inside the cap.

## Technical Context

**Language/Version**: TypeScript 5.x (ESM, strict mode), Node.js 20 runtime  
**Primary Dependencies**: Ink 5.x + React 18 (TUI), `htmlparser2` (HTML anchor extraction), existing Gmail detail adapter output  
**Storage**: N/A (no persistence changes)  
**Testing**: Vitest 1.x (`tests/unit`, `tests/integration`, `tests/contract`)  
**Target Platform**: Terminal-based TUI on macOS/Linux/Windows  
**Project Type**: Single project (CLI/TUI application)  
**Performance Goals**: All URL tokens honor width cap rules (SC-002), and rendering remains exception-free for mixed-content fixtures including malformed URL-like strings (SC-003)  
**Constraints**: No run of blank lines >2; whitespace-only lines treated as blank; trailing punctuation excluded from URL match; truncation is `floor(width/2)` with minimum 12; URL reconciliation strips query params and ignores fragments/default ports; HTML parse is TUI-layer only; skip extraction when HTML >1 MB or parse fails (silent fallback); no caching required in current scope  
**Scale/Scope**: Per-message detail rendering for loaded inbox messages, including long/plain/malformed URL-heavy bodies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | PASS | Rendering-only change; no destructive Gmail operations; no secrets introduced. |
| II. Strict TDD | PASS | Plan requires red-green-refactor sequence with unit-first coverage for formatter behavior. |
| III. Modular Architecture | PASS | Formatting logic isolated in TUI formatter utility, separated from fetching and navigation state. |
| IV. CLI Excellence | PASS | Improves readability in terminal detail pane without changing CLI semantics or exit behavior. |
| V. Simplicity & YAGNI | PASS | Defers optional copy/open URL interactions and URL mapping persistence from core scope. |

**Post-Phase 1 Re-check**: Design artifacts remain compliant with all constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/003-email-rendering/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── email-rendering.ts
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── tui/
│   ├── email_preview.ts             # MODIFY: apply formatter pipeline for body rendering
│   ├── email_detail_formatter.ts    # NEW: pure formatting utilities (blank lines + URL token rendering)
│   ├── html_anchor_extractor.ts     # NEW: htmlparser2-based anchor extraction + normalization utilities
│   └── app.ts                       # MODIFY (if needed): pass detail pane width to formatter context
└── adapters/
    └── gmail/
        └── get_email.ts             # MODIFY: expose decoded html_body alongside body in EmailDetail

tests/
├── unit/
│   ├── email_preview.test.ts        # MODIFY: end-to-end formatter assertions at preview boundary
│   ├── email_detail_formatter.test.ts # NEW: rule-level unit tests for normalization and truncation
│   └── html_anchor_extractor.test.ts # NEW: anchor extraction, normalization, ambiguity, and fallback rules
├── integration/
│   ├── detail_navigation_flow.test.ts # MODIFY/ADD: verify rendered detail and fallback behavior
│   └── detail_navigation_keys.test.ts # MODIFY/ADD: verify key-navigation stability with formatted detail output
└── contract/
    └── email_detail.test.ts         # MODIFY: include html_body contract expectations
```

**Structure Decision**: Keep all behavior inside existing single-project layering. UI rendering delegates deterministic text transformations to a pure formatter utility, avoiding business/data-layer coupling (SoC-aligned).

## Complexity Tracking

No constitution violations. No complexity exceptions required.
